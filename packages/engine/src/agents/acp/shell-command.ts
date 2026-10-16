import type {
  CreateTerminalRequest,
  TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import type { AgentLaunch } from '../agent-launch';
import { agentEnvironment } from '../launch/agent-environment';
import type { AcpChild } from './process';
import { exitDrainMs } from './process-output';

export type ShellCommand = {
  exited: Promise<TerminalExitStatus>;
  kill: () => void;
};

export type ShellCommandInput = {
  request: CreateTerminalRequest;
  launch: AgentLaunch;
  cwd: string;
  output: (text: string) => void;
};

export const observeShellCommand = async (
  child: AcpChild,
  output: (text: string) => void,
): Promise<ShellCommand> => {
  pipeShellOutput(child, output);
  const started = Promise.withResolvers<void>();
  const exited = observeShellExit(child);
  child.once('spawn', () => started.resolve());
  child.once('error', (error) => started.reject(error));
  await started.promise;

  return {
    exited,
    kill: shellKiller(child),
  };
};

const observeShellExit = (child: AcpChild): Promise<TerminalExitStatus> => {
  const exited = Promise.withResolvers<TerminalExitStatus>();
  child.once('close', (exitCode, signal) =>
    exited.resolve({ exitCode, signal }),
  );
  child.once('exit', (exitCode, signal) =>
    drainShellOutput(child, () => exited.resolve({ exitCode, signal })),
  );

  return exited.promise;
};

const pipeShellOutput = (
  child: AcpChild,
  output: (text: string) => void,
): void => {
  child.stdin.end();
  child.stdout.setEncoding('utf8').on('data', output);
  child.stderr.setEncoding('utf8').on('data', output);
};

export const shellCommandEnvironment = async (
  input: ShellCommandInput,
): Promise<NodeJS.ProcessEnv> => {
  const env = await agentEnvironment(input.launch);

  for (const { name, value } of input.request.env ?? []) env[name] = value;

  return env;
};

const shellKiller =
  (child: AcpChild): ShellCommand['kill'] =>
  () => {
    child.kill('SIGKILL');
  };

const drainShellOutput = (child: AcpChild, drained: () => void): void => {
  const timer = setTimeout(() => {
    child.stdout.destroy();
    child.stderr.destroy();
    drained();
  }, exitDrainMs);

  child.once('close', () => clearTimeout(timer));
};
