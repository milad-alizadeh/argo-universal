import type {
  CreateTerminalRequest,
  TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import type { AgentLaunch } from '../agent-launch';
import { agentEnvironment } from '../launch/agent-environment';
import type { AcpChild } from './process';
import { exitDrainMs } from './process-output';
import { terminateShellTree } from './shell-process-tree';

export type ShellCommand = {
  exited: Promise<TerminalExitStatus>;
  kill: () => boolean;
  isRunning: () => boolean;
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
  const exited = observeShellExit(child);
  await waitForShellStart(child);

  return {
    exited,
    kill: shellKiller(child),
    isRunning: () => !shellHasExited(child),
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
    if (shellHasExited(child)) return false;

    return killRunningShell(child);
  };

const drainShellOutput = (child: AcpChild, drained: () => void): void => {
  const timer = setTimeout(() => {
    child.stdout.destroy();
    child.stderr.destroy();
    drained();
  }, exitDrainMs);

  child.once('close', () => clearTimeout(timer));
};

const shellHasExited = (child: AcpChild): boolean =>
  child.exitCode !== null || child.signalCode !== null;

const killRunningShell = (child: AcpChild): boolean => {
  if (!child.pid) return false;
  terminateShellTree(child.pid);

  return true;
};

const waitForShellStart = (child: AcpChild): Promise<void> => {
  const started = Promise.withResolvers<void>();
  child.once('spawn', () => started.resolve());
  child.once('error', (error) => started.reject(error));

  return started.promise;
};
