import type { AgentAuthenticateOutput, AgentAuthState } from '@repo/contracts';
import { skipToken, type SkipToken, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
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
  // Why this Device's last attempt failed, until its next one starts.
  failure: string | undefined;
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
  const cancel = useMutation(trpc.agents.cancelAuthenticate.mutationOptions());

  return {
    ...useAuthenticate(subject),
    cancel: () => cancel.mutate(subject),
    ...useTerminalActions(subject),
  };
}

const failureOf = (outcome: AgentAuthenticateOutput): string | undefined =>
  outcome.status === 'failed' ? outcome.message : undefined;

interface Answers {
  onMutate: () => void;
  onSuccess: (outcome: AgentAuthenticateOutput) => void;
}

const answeredBy = (setFailure: (failure?: string) => void): Answers => ({
  onMutate: () => setFailure(undefined),
  onSuccess: (outcome) => setFailure(failureOf(outcome)),
});

// An attempt answers when it settles: a failed one says why, and the next one clears it.
function useAuthenticate(
  subject: SignInSubject,
): Pick<SignInActions, 'authenticate' | 'failure'> {
  const trpc = useTRPC();
  const [failure, setFailure] = useState<string>();

  const authenticate = useMutation(
    trpc.agents.authenticate.mutationOptions(answeredBy(setFailure)),
  );

  return {
    authenticate: (methodId) => authenticate.mutate({ ...subject, methodId }),
    failure,
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
