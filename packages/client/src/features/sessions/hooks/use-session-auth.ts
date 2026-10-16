import type { AgentAuthChange, AgentAuthState } from '@repo/contracts';
import {
  type QueryClient,
  skipToken,
  type SkipToken,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';
import { finishedSignIn } from '../state/session-auth';
import type {
  AuthCalloutProps,
  SessionCalloutProps,
  TerminalSignInProps,
} from '../types/session-callout';
import { signInReadToast } from '../utils/session-toasts';
import {
  inputOf,
  type SignInActions,
  type SignInSubject,
  terminalOf,
  useSignInActions,
} from './use-sign-in-actions';

export interface SessionAuthSubject {
  agent: string;
  projectId: string;
  agentName: string;
}

export interface SessionAuthOptions {
  subject: SessionAuthSubject | undefined;
  // The sign-in callout is on show, so this Device reads and follows the Agent's sign-in.
  active: boolean;
  // A sign-in finished, here or on another Device: the open runs again.
  onSignedIn: () => void;
}

export interface SessionAuth {
  // Loading… until the Agent's methods arrive, then the sign-in.
  callout: SessionCalloutProps;
  // A running terminal method's panel or sheet.
  terminal: TerminalSignInProps | undefined;
}

type Subject = SignInSubject;

const subjectOf = ({ agent, projectId }: SessionAuthSubject): Subject => ({
  agent,
  projectId,
});

// Only a shown sign-in callout reads and follows the Agent's sign-in.
const followedSubject = (options: SessionAuthOptions): Subject | SkipToken =>
  options.active && options.subject ? subjectOf(options.subject) : skipToken;

const stateOf = ({
  outcome: _outcome,
  ...state
}: AgentAuthChange): AgentAuthState => state;

const loading: SessionAuth = {
  callout: { kind: 'loading' },
  terminal: undefined,
};

// Zed's sign-in for a Session: the Agent's methods, Authenticate and Cancel, and every Device following one sign-in.
export function useSessionAuth(options: SessionAuthOptions): SessionAuth {
  const subject = followedSubject(options);
  const state = useAuthState(subject);
  useErrorToast(signInReadToast(state.error));
  useFollowSignIn({ subject, onSignedIn: options.onSignedIn });
  const actions = useSignInActions(subject);

  return authOf(options.subject, state.data, actions);
}

const authOf = (
  subject: SessionAuthSubject | undefined,
  state: AgentAuthState | undefined,
  actions: SignInActions,
): SessionAuth =>
  state && subject ? signIn(subject, state, actions) : loading;

type AuthStateQuery = UseQueryResult<AgentAuthState, unknown>;

// A failed read keeps Loading…, as a failed load does: the toast says why, and the read runs again when the Connection reopens or the window regains focus.
function useAuthState(subject: Subject | SkipToken): AuthStateQuery {
  const trpc = useTRPC();

  return useQuery(
    trpc.agents.authState.queryOptions(subject, {
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    }),
  );
}

function signIn(
  subject: SessionAuthSubject,
  state: AgentAuthState,
  actions: SignInActions,
): SessionAuth {
  const terminal = terminalOf(state, actions);

  return {
    callout: {
      kind: 'authenticate',
      ...calloutOf(subject, state, actions),
      terminal: !!terminal,
    },
    terminal,
  };
}

const calloutOf = (
  subject: SessionAuthSubject,
  state: AgentAuthState,
  actions: SignInActions,
): AuthCalloutProps => ({
  agentName: subject.agentName,
  methods: state.methods,
  message: state.description,
  failure: actions.failure,
  pending: state.pending !== null,
  onAuthenticate: actions.authenticate,
  onCancel: actions.cancel,
});

interface FollowSignIn {
  subject: Subject | SkipToken;
  onSignedIn: () => void;
}

type AuthStateKey = ReturnType<
  ReturnType<typeof useTRPC>['agents']['authState']['queryKey']
>;

const followChange =
  (cache: QueryClient, key: AuthStateKey, onSignedIn: () => void) =>
  (change: AgentAuthChange): void => {
    const wasPending = cache.getQueryData(key)?.pending != null;
    cache.setQueryData(key, stateOf(change));

    if (finishedSignIn(wasPending, change)) onSignedIn();
  };

// Every change goes into the cached state; one that ends a running sign-in well runs the open again.
function useFollowSignIn({ subject, onSignedIn }: FollowSignIn): void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const key = trpc.agents.authState.queryKey(inputOf(subject));

  const subscription = useSubscription(
    trpc.agents.authChanges.subscriptionOptions(subject, {
      onData: followChange(cache, key, onSignedIn),
    }),
  );

  useResubscribeOnReconnect(subscription);
}
