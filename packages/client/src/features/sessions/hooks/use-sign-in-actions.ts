import type { AgentAuthState } from '@repo/contracts';
import { skipToken, type SkipToken, useMutation } from '@tanstack/react-query';
import { useTRPC, useTRPCClient } from '#features/connection';
import type { TerminalSignInProps } from '../components/terminal-sign-in/terminal-sign-in';

export interface SignInSubject {
  agent: string;
  projectId: string;
}

const noSubject: SignInSubject = { agent: '', projectId: '' };

// The subject's input, or an empty one while nothing is followed and no action can run.
export const inputOf = (followed: SignInSubject | SkipToken): SignInSubject =>
  followed === skipToken ? noSubject : followed;

export interface SignInActions {
  authenticate: (methodId: string) => void;
  cancel: () => void;
  read: TerminalSignInProps['terminal']['onRead'];
  input: TerminalSignInProps['terminal']['onInput'];
}

// Actions run only while the callout shows, so the subject is there.
export function useSignInActions(
  followed: SignInSubject | SkipToken,
): SignInActions {
  const subject = inputOf(followed);
  const trpc = useTRPC();
  const authenticate = useMutation(trpc.agents.authenticate.mutationOptions());
  const cancel = useMutation(trpc.agents.cancelAuthenticate.mutationOptions());

  return {
    authenticate: (methodId) => authenticate.mutate({ ...subject, methodId }),
    cancel: () => cancel.mutate(subject),
    ...useTerminalActions(subject),
  };
}

function useTerminalActions(
  subject: SignInSubject,
): Pick<SignInActions, 'read' | 'input'> {
  const client = useTRPCClient();

  return {
    read: (cursor) => client.agents.authTerminal.query({ ...subject, cursor }),
    input: (input) =>
      client.agents.authTerminalInput.mutate({ ...subject, input }),
  };
}

// Closing the terminal before its command exits cancels the sign-in, which counts as a failure.
export function terminalOf(
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
