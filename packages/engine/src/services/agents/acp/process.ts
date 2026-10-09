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
  const bridge = new TransformStream<Uint8Array, Uint8Array>();
  void Readable.toWeb(child.stdout)
    .pipeTo(bridge.writable)
    .catch(() => {});
  return bridge.readable;
};
const observeExit = (child: ChildProcessWithoutNullStreams): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', () => resolve());
  });
const processLifetime = (child: ChildProcessWithoutNullStreams): AcpProcess => {
  child.stderr.resume();
  const exited = observeExit(child);
  return {
    stream: ndJsonStream(Writable.toWeb(child.stdin), processOutput(child)),
    exited,
    terminate: async () => {
      child.kill('SIGTERM');
      await exited;
    },
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
