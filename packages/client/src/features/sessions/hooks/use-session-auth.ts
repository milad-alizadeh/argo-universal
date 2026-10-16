import type { AgentAuthChange, AgentAuthState } from '@repo/contracts';
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import {
  useResubscribeOnReconnect,
  useTRPC,
  useTRPCClient,
} from '#features/connection';
import type { AuthCalloutProps } from '../components/auth-callout/auth-callout';
import type { TerminalSignInProps } from '../components/terminal-sign-in/terminal-sign-in';
import { finishedSignIn } from '../state/session-auth';

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
  // Undefined until the Agent's methods arrive.
  callout: AuthCalloutProps | undefined;
  // A running terminal method's panel or sheet.
  terminal: TerminalSignInProps | undefined;
}

type Subject = Pick<SessionAuthSubject, 'agent' | 'projectId'>;

const noSubject: Subject = { agent: '', projectId: '' };

const subjectOf = (subject: SessionAuthSubject | undefined): Subject =>
  subject ? { agent: subject.agent, projectId: subject.projectId } : noSubject;

const stateOf = ({
  outcome: _outcome,
  ...state
}: AgentAuthChange): AgentAuthState => state;

const followed = (options: SessionAuthOptions): boolean =>
  options.active && options.subject !== undefined;

const noSignIn: SessionAuth = { callout: undefined, terminal: undefined };

// Zed's sign-in for a Session: the Agent's methods, Authenticate and Cancel, and every Device following one sign-in.
export function useSessionAuth(options: SessionAuthOptions): SessionAuth {
  const subject = subjectOf(options.subject);
  const enabled = followed(options);
  const state = useAuthState(subject, enabled);
  useFollowSignIn({ subject, enabled, onSignedIn: options.onSignedIn });
  const actions = useSignInActions(subject);

  return state && options.subject
    ? signIn(options.subject, state, actions)
    : noSignIn;
}

function useAuthState(
  subject: Subject,
  enabled: boolean,
): AgentAuthState | undefined {
  const trpc = useTRPC();

  const state = useQuery(
    trpc.agents.authState.queryOptions(subject, { enabled }),
  );

  return enabled ? state.data : undefined;
}

function signIn(
  subject: SessionAuthSubject,
  state: AgentAuthState,
  actions: SignInActions,
): SessionAuth {
  const terminal = terminalOf(state, actions);

  return {
    callout: { ...calloutOf(subject, state, actions), terminal: !!terminal },
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
  pending: state.pending !== null,
  onAuthenticate: actions.authenticate,
  onCancel: actions.cancel,
});

interface FollowSignIn {
  subject: Subject;
  enabled: boolean;
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
function useFollowSignIn({ subject, enabled, onSignedIn }: FollowSignIn): void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const key = trpc.agents.authState.queryKey(subject);

  const subscription = useSubscription(
    trpc.agents.authChanges.subscriptionOptions(subject, {
      enabled,
      onData: followChange(cache, key, onSignedIn),
    }),
  );

  useResubscribeOnReconnect(subscription);
}

interface SignInActions {
  authenticate: (methodId: string) => void;
  cancel: () => void;
  read: TerminalSignInProps['terminal']['onRead'];
  input: TerminalSignInProps['terminal']['onInput'];
}

function useSignInActions(subject: Subject): SignInActions {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const authenticate = useMutation(trpc.agents.authenticate.mutationOptions());
  const cancel = useMutation(trpc.agents.cancelAuthenticate.mutationOptions());

  return {
    authenticate: (methodId) => authenticate.mutate({ ...subject, methodId }),
    cancel: () => cancel.mutate(subject),
    read: (cursor) => client.agents.authTerminal.query({ ...subject, cursor }),
    input: (input) =>
      client.agents.authTerminalInput.mutate({ ...subject, input }),
  };
}

// Closing the terminal before its command exits cancels the sign-in, which counts as a failure.
function terminalOf(
  state: AgentAuthState,
  actions: SignInActions,
): TerminalSignInProps | undefined {
  const method = state.methods.find(({ id }) => id === state.pending?.methodId);

  return method?.type === 'terminal'
    ? {
        title: method.name,
        onClose: actions.cancel,
        terminal: terminalActions(actions),
      }
    : undefined;
}

const terminalActions = (
  actions: SignInActions,
): TerminalSignInProps['terminal'] => ({
  onRead: actions.read,
  onInput: actions.input,
  onFailure: async () => actions.cancel(),
});
