import type {
  AgentLoginOperation,
  AgentLoginTerminalInput,
} from '@repo/contracts';
import { useTRPCClient } from '#features/connection';
import type { LoginTerminalProps } from '../components/agent-login-terminal/terminal-props';

export function useLoginTerminal(
  operation: AgentLoginOperation | undefined,
  onFailure: (error: { message: string }) => void,
): Omit<LoginTerminalProps, 'enabled'> {
  const client = useTRPCClient();

  const identity = (): AgentLoginOperation => requireOperation(operation);

  return {
    onRead: (cursor) =>
      client.agents.loginTerminal.query({ ...identity(), cursor }),
    onInput: (input: AgentLoginTerminalInput) =>
      client.agents.inputLoginTerminal.mutate({ ...identity(), input }),
    onFailure: async (message) => onFailure(new Error(message)),
  };
}

const requireOperation = (
  operation: AgentLoginOperation | undefined,
): AgentLoginOperation => {
  if (!operation) throw new Error('Sign-in has not started');

  return operation;
};
