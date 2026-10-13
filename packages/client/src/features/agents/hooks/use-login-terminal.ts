import type { AgentLoginTerminalInput } from '@repo/contracts';
import { useTRPCClient } from '#features/connection';
import type { LoginTerminalProps } from '../components/agent-login-terminal/terminal-props';
import { loginIdentity, type OwnedLogin } from './login-operation';
export function useLoginTerminal(
  operation: OwnedLogin | undefined,
  onFailure: (error: { message: string }) => void,
): Omit<LoginTerminalProps, 'enabled'> {
  const client = useTRPCClient();
  const identity = (): ReturnType<typeof loginIdentity> =>
    requireIdentity(operation);
  return {
    onRead: (cursor) =>
      client.agents.loginTerminal.query({ ...identity(), cursor }),
    onInput: (input: AgentLoginTerminalInput) =>
      client.agents.inputLoginTerminal.mutate({ ...identity(), input }),
    onFailure: async (message) => onFailure(new Error(message)),
  };
}

const requireIdentity = (
  operation: OwnedLogin | undefined,
): ReturnType<typeof loginIdentity> => {
  if (!operation) throw new Error('Sign-in has not started');
  return loginIdentity(operation);
};
