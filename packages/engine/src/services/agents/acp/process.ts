import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { ndJsonStream, type Stream } from '@agentclientprotocol/sdk';
import type { AcpProcess, AgentLaunch } from './resource-types';

const createCapturedEnvironment = (launch: AgentLaunch): NodeJS.ProcessEnv => {
  const environment = { ...process.env, ...launch.env };
  for (const key of Object.keys(environment))
    if (!Object.hasOwn(launch.env, key)) delete environment[key];
  return environment;
};
const createProcessOutputStream = (
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
const observeChildClose = (
  child: ChildProcessWithoutNullStreams,
): Promise<void> =>
  new Promise((resolve) => {
    child.once('close', () => resolve());
  });
const observeChildSpawn = (
  child: ChildProcessWithoutNullStreams,
): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
// One Agent frame may hold at most 32 MiB; a larger one fails the connection with the SDK's MessageTooLargeError.
const agentFrameLimit = 33_554_432;
const createAcpProtocolStream = (
  child: ChildProcessWithoutNullStreams,
): Stream =>
  ndJsonStream(Writable.toWeb(child.stdin), createProcessOutputStream(child), {
    maxMessageBytes: agentFrameLimit,
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
  spawned: Promise<void>,
  closed: Promise<void>,
): Promise<void> => {
  await spawned.then(
    () => signalOwnedProcess(child),
    () => {},
  );
  await closed;
};
const ownAcpChildProcess = (
  child: ChildProcessWithoutNullStreams,
): AcpProcess => {
  child.stderr.resume();
  const closed = observeChildClose(child);
  const spawned = observeChildSpawn(child);
  void spawned.catch(() => {});
  return {
    stream: createAcpProtocolStream(child),
    exited: closed,
    terminate: () => terminateChild(child, spawned, closed),
  };
};
export const launchAcpProcess = async (
  launch: AgentLaunch,
): Promise<AcpProcess> =>
  ownAcpChildProcess(
    spawn(launch.executable, [...launch.args], {
      cwd: launch.cwd,
      env: createCapturedEnvironment(launch),
      stdio: 'pipe',
    }),
  );
