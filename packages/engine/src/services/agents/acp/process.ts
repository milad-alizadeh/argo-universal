import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import type { AcpProcess, AgentLaunch } from './resource-types';

const exactEnvironment = (launch: AgentLaunch): NodeJS.ProcessEnv => {
  const environment = { ...process.env, ...launch.env };
  for (const key of Object.keys(environment))
    if (!Object.hasOwn(launch.env, key)) delete environment[key];
  return environment;
};
const processOutput = (
  child: ChildProcessWithoutNullStreams,
): ReadableStream<Uint8Array> => {
  const bridge = new TransformStream<Uint8Array, Uint8Array>({
    start: (controller): void => {
      child.once('error', (error) => controller.error(error));
    },
  });
  void Readable.toWeb(child.stdout)
    .pipeTo(bridge.writable)
    .catch(() => {});
  return bridge.readable;
};
const observeExit = (child: ChildProcessWithoutNullStreams): Promise<void> =>
  new Promise((resolve) => {
    child.once('close', () => resolve());
  });
const observeStart = (child: ChildProcessWithoutNullStreams): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
const isOwnedPid = (pid: number | undefined): boolean =>
  typeof pid === 'number' && Number.isInteger(pid) && pid > 0;
const signalOwnedProcess = (child: ChildProcessWithoutNullStreams): void => {
  if (!isOwnedPid(child.pid))
    throw new Error('ACP child process has no valid owned process identity');
  child.kill('SIGTERM');
};
const terminateChild = async (
  child: ChildProcessWithoutNullStreams,
  started: Promise<void>,
  exited: Promise<void>,
): Promise<void> => {
  await started.then(
    () => signalOwnedProcess(child),
    () => {},
  );
  await exited;
};
const processLifetime = (child: ChildProcessWithoutNullStreams): AcpProcess => {
  child.stderr.resume();
  const exited = observeExit(child);
  const started = observeStart(child);
  void started.catch(() => {});
  return {
    stream: ndJsonStream(Writable.toWeb(child.stdin), processOutput(child)),
    exited,
    terminate: () => terminateChild(child, started, exited),
  };
};
export const launchAcpProcess = async (
  launch: AgentLaunch,
): Promise<AcpProcess> =>
  processLifetime(
    spawn(launch.executable, [...launch.args], {
      cwd: launch.cwd,
      env: exactEnvironment(launch),
      stdio: 'pipe',
    }),
  );
