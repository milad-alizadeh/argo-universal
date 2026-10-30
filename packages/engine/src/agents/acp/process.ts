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
