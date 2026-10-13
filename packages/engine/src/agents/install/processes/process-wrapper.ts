import {
  spawn,
  type ChildProcess,
  type Serializable,
} from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import type { InstallToolInput } from '../ports';
import { cleanInstallProcess } from './process-cleanup';
import { recordInstallerGroup } from './process-record';

const installerWrapper = `
const { spawn } = require('node:child_process');
const stop = () => process.kill(-process.pid, 'SIGKILL');
const completed = code => {
  if (!process.connected) return stop();
  process.send({type: 'installer.exit', code}, error => { if (error) stop(); });
};
process.on('SIGTERM', () => {});
process.once('disconnect', stop);
process.once('message', () => {
  if (!process.connected) return stop();
  const child = spawn(process.argv[2], process.argv.slice(3), {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.once('error', () => completed(127));
  child.once('exit', code => completed(code));
});
`;

// The completion message the wrapper sends over IPC.
const InstallerExit = z.strictObject({
  type: z.literal('installer.exit'),
  code: z.number().int().nonnegative().nullable(),
});

const rejections = createRejectionCounter('Installer messages');

export const readInstallerExitCode = (message: Serializable): number | null => {
  const exit = InstallerExit.safeParse(message);

  if (exit.success) return exit.data.code;
  rejections.report('Unrecognised installer completion');
  throw new Error('Unrecognised installer completion');
};

const wrapperArguments = (input: InstallToolInput, token: string): string[] => [
  '-e',
  installerWrapper,
  '--',
  token,
  input.executable,
  ...input.args,
];

const saveSpawnedGroup = async (
  child: ChildProcess,
  directory: string,
  token: string,
): Promise<void> => {
  if (!child.pid) throw new Error('Installer wrapper failed to start');

  try {
    await recordInstallerGroup(directory, { pid: child.pid, token });
  } catch (error) {
    await cleanInstallProcess(child);
    throw error;
  }
};

export const spawnInstallWrapper = async (
  input: InstallToolInput,
): Promise<ChildProcess> => {
  const token = randomUUID();

  const child = spawn(process.execPath, wrapperArguments(input, token), {
    cwd: input.cwd,
    env: { ...process.env, ...input.env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    detached: true,
  });

  await saveSpawnedGroup(child, input.cwd, token);

  return child;
};
