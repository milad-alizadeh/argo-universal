import { setTimeout as delay } from 'node:timers/promises';
import { processGroupMembers } from '../../lib/process-group-members';

const signalGraceMs = 1000;

const observationIntervalMs = 25;

const isMissingProcess = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ESRCH';

const groupExists = (pid: number): boolean =>
  processGroupMembers(pid).length > 0;

const signalGroup = (pid: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isMissingProcess(error)) throw error;
  }
};

export const observeTerminalRelease = async (pid: number): Promise<boolean> => {
  const deadline = Date.now() + signalGraceMs;

  while (groupExists(pid) && Date.now() < deadline)
    await delay(observationIntervalMs);

  return !groupExists(pid);
};

export const releaseTerminalGroup = async (pid: number): Promise<void> => {
  if (!groupExists(pid)) return;
  signalGroup(pid, 'SIGTERM');

  if (await observeTerminalRelease(pid)) return;
  await forceRelease(pid);
};

const forceRelease = async (pid: number): Promise<void> => {
  signalGroup(pid, 'SIGKILL');

  if (!(await observeTerminalRelease(pid)))
    throw new Error('Sign-in terminal descendants did not close');
};
