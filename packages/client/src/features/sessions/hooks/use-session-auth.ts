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
import type { AuthCalloutProps } from '../components/auth-callout/auth-callout';
import { sessionOpenErrorMessage } from '../components/failure-messages';
import type { SessionCalloutProps } from '../components/session-callout/session-callout';
import type { TerminalSignInProps } from '../components/terminal-sign-in/terminal-sign-in';
import { finishedSignIn } from '../state/session-auth';
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
  // Loading… until the Agent's methods arrive, then the sign-in; Failed to Launch when they can't be read.
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
  useFollowSignIn({ subject, onSignedIn: options.onSignedIn });
  const actions = useSignInActions(subject);

  if (state.error) return unreadable(state);

  return authOf(options.subject, state.data, actions);
}

const authOf = (
  subject: SessionAuthSubject | undefined,
  state: AgentAuthState | undefined,
  actions: SignInActions,
): SessionAuth =>
  state && subject ? signIn(subject, state, actions) : loading;

type AuthStateQuery = UseQueryResult<AgentAuthState, unknown>;

function useAuthState(subject: Subject | SkipToken): AuthStateQuery {
  const trpc = useTRPC();

  return useQuery(trpc.agents.authState.queryOptions(subject));
}

// Methods that can't be read say why, and Retry reads them again.
const unreadable = (state: AuthStateQuery): SessionAuth => ({
  callout: {
    kind: 'launch',
    message: sessionOpenErrorMessage(state.error),
    onRetry: () => void state.refetch(),
  },
  terminal: undefined,
});

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
