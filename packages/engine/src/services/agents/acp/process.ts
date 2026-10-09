import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import type { AcpProcess, AgentLaunch } from './resource-types';

const observeExit = (child: ChildProcessWithoutNullStreams): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', () => resolve());
  });
const processLifetime = (child: ChildProcessWithoutNullStreams): AcpProcess => {
  child.stderr.resume();
  const exited = observeExit(child);
  return {
    stream: ndJsonStream(
      Writable.toWeb(child.stdin),
      Readable.toWeb(child.stdout),
    ),
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
      env: { ...launch.env },
      stdio: 'pipe',
    }),
  );
