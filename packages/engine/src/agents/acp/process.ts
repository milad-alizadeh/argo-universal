import {
  spawn,
  type ChildProcess,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Readable, Writable } from 'node:stream';
import type { AgentLaunch } from '..';
import { agentEnvironment } from '../launch/agent-environment';
import { ProcessOutput, exitDrainMs } from './process-output';
import type { AcpProcess } from './resources/resource-types';
import {
  observeShellCommand,
  type ShellCommandInput,
  type ShellCommand,
} from './shell-commands/shell-command';
import {
  shellEnvironment,
  requireShellPipe,
} from './shell-commands/shell-start';
import { shellWrapper } from './shell-commands/shell-wrapper';

export { AgentProcessExitError, exitDrainMs } from './process-output';

export type AcpChild = ChildProcessWithoutNullStreams;

export type { Serializable } from 'node:child_process';

export type ShellChild = ChildProcess & {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
};

const quote = (argument: string): string =>
  `'${argument.replaceAll("'", "'\\''")}'`;

const ownProcess = (child: ChildProcessWithoutNullStreams): AcpProcess => {
  const output = new ProcessOutput(child);
  const exited = output.observeExit();

  return {
    stream: output.stream(),
    exited,
    exitError: output.exitError,
    terminate: async () => {
      child.kill('SIGTERM');
      await exited;
    },
  };
};

const spawnAgent = (
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): ChildProcessWithoutNullStreams =>
  spawn(
    process.env.SHELL ?? '/bin/sh',
    ['-c', `exec ${[launch.executable, ...launch.args].map(quote).join(' ')}`],
    {
      cwd: launch.cwd,
      env: environment,
      detached: false,
      stdio: 'pipe',
    },
  );

export const launchAcpProcess = async (
  launch: AgentLaunch,
): Promise<AcpProcess> =>
  ownProcess(spawnAgent(launch, await agentEnvironment(launch)));

export const drainProcessExit = async (process: AcpProcess): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      process.exited,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, exitDrainMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

export const rejectClosedOpening = async (
  process: AcpProcess | undefined,
  cause: unknown,
): Promise<never> => {
  if (!process) throw cause;
  await drainProcessExit(process);
  throw process.exitError ? process.exitError() : cause;
};

export const launchShellCommand = async (
  input: ShellCommandInput,
): Promise<ShellCommand> => {
  if (process.platform === 'win32')
    throw new Error('Shell process groups are unavailable');
  const token = randomUUID();
  const env = await shellEnvironment(input);

  return observeShellCommand(spawnShellCommand(input, token), input, {
    token,
    env,
  });
};

const spawnShellCommand = (
  input: ShellCommandInput,
  token: string,
): ShellChild => {
  const child = spawn(process.execPath, ['-e', shellWrapper, '--', token], {
    cwd: input.request.cwd ?? input.cwd,
    env: { NODE_ENV: process.env.NODE_ENV },
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  return withShellPipes(child);
};

const withShellPipes = (child: ReturnType<typeof spawn>): ShellChild => {
  requireShellPipe(child.stdin);
  requireShellPipe(child.stdout);
  requireShellPipe(child.stderr);

  return Object.assign(child, {
    stdin: child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
  });
};
