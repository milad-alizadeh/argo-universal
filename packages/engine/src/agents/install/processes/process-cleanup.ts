import type { ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { InstallCleanupError } from './cleanup-error';
import { installerGroupMembers } from './process-group';
const cleanupLimit = 5000,
  pollInterval = 25,
  killGrace = 1000;
export { InstallCleanupError } from './cleanup-error';
const isGone = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ESRCH';
const signalGroup = (pid: number, signal: NodeJS.Signals | 0): boolean => {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (isGone(error)) return false;
    throw new InstallCleanupError(
      'Installer process group cannot be observed',
      { cause: error },
    );
  }
};
const escalateGroup = (pid: number, started: number): void => {
  if (Date.now() - started >= killGrace) signalGroup(pid, 'SIGKILL');
};
const waitForGroup = async (pid: number): Promise<void> => {
  const started = Date.now();
  const deadline = started + cleanupLimit;
  while (installerGroupMembers(pid).length > 0) {
    if (Date.now() >= deadline)
      throw new InstallCleanupError('Installer descendants did not exit');
    escalateGroup(pid, started);
    await sleep(pollInterval);
  }
};
export const cleanInstallProcess = async (
  child: Pick<ChildProcess, 'pid'>,
): Promise<void> => {
  if (!child.pid) return;
  signalGroup(child.pid, 'SIGTERM');
  await waitForGroup(child.pid);
};
export const cleanExitedInstallProcess = async (
  child: ChildProcess,
): Promise<void> => {
  if (!child.pid) return;
  signalGroup(child.pid, 'SIGKILL');
  await waitForGroup(child.pid);
};
