import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AgentLaunch } from '..';
import { agentEnvironment } from '../launch/agent-environment';
import { ProcessOutput, exitDrainMs } from './process-output';
import type { AcpProcess } from './resources/resource-types';

export { AgentProcessExitError } from './process-output';

export type AcpChild = ChildProcessWithoutNullStreams;

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
  detached = false,
): ChildProcessWithoutNullStreams =>
  spawn(
    process.env.SHELL ?? '/bin/sh',
    ['-c', `exec ${[launch.executable, ...launch.args].map(quote).join(' ')}`],
    {
      cwd: launch.cwd,
      env: environment,
      detached,
      stdio: 'pipe',
    },
  );

export const launchAcpProcess = async (
  launch: AgentLaunch,
): Promise<AcpProcess> =>
  ownProcess(spawnAgent(launch, await agentEnvironment(launch)));

const ownsGroup = process.platform !== 'win32';

export async function launchAgentStatus(
  launch: AgentLaunch,
  signal: AbortSignal,
): Promise<AcpChild> {
  const command = { ...launch, sessionAccess: undefined };
  const env = await agentEnvironment(command);

  signal.throwIfAborted();

  return spawnAgent(command, env, ownsGroup);
}

export function stopAgentStatus(child: AcpChild): void {
  if (!child.pid) return;

  try {
    signalStatus(child, child.pid);
  } catch {
    // An Agent that already exited needs no signal.
  }
}

function signalStatus(child: AcpChild, pid: number): void {
  if (ownsGroup) process.kill(-pid, 'SIGKILL');
  else child.kill('SIGKILL');
}

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
