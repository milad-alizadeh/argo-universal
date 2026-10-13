import type { AgentLoginSnapshot } from '@repo/contracts';
import type { LoginAgentRequest } from './agent-launch';

type LoginProgress = Pick<AgentLoginSnapshot, 'terminal' | 'request'>;

// A Login snapshot names the sign-in terminal and browser request only while they are open.
export const loginProgress = (
  terminalRunning: boolean,
  request: LoginAgentRequest | undefined,
): LoginProgress => {
  const progress: LoginProgress = {};

  if (terminalRunning) progress.terminal = true;

  if (request) progress.request = request;

  return progress;
};
