import type { AgentAuthTerminalInput } from '@repo/contracts';
import type { AuthenticationMethod } from '../acp/auth-methods';
import type { AgentLaunch, LoginTerminalProcess } from '../agent-launch';

export type TerminalResult = 'matched' | { exitCode: number; signal?: number };

export const applyTerminalInput = (
  child: LoginTerminalProcess,
  input: AgentAuthTerminalInput,
): void => {
  switch (input.type) {
    case 'write':
      child.write(input.text);
      break;
    case 'resize':
      child.resize(input.cols, input.rows);
  }
};

export const terminalSucceeded = (result: {
  exitCode: number;
  signal?: number;
}): boolean => result.exitCode === 0 && !result.signal;

// The full get-command with the method's args appended and its env on top.
export const terminalMethodLaunch = (
  launch: AgentLaunch,
  method: Pick<AuthenticationMethod, 'args' | 'env'>,
): AgentLaunch => ({
  ...launch,
  args: [...launch.args, ...(method.args ?? [])],
  env: { ...launch.env, ...method.env },
});
