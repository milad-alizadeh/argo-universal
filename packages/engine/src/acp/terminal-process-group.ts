import { setTimeout as delay } from 'node:timers/promises';
const signalGraceMs = 1000;
const observationIntervalMs = 25;
const isMissingProcess = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ESRCH';
const groupExists = (pid: number): boolean => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcess(error)) return false;
    throw error;
  }
};
const signalGroup = (pid: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isMissingProcess(error)) throw error;
  }
};
const observeRelease = async (pid: number): Promise<boolean> => {
  const deadline = Date.now() + signalGraceMs;
  while (groupExists(pid) && Date.now() < deadline)
    await delay(observationIntervalMs);
  return !groupExists(pid);
};
export const releaseTerminalGroup = async (pid: number): Promise<void> => {
  signalGroup(pid, 'SIGTERM');
  if (await observeRelease(pid)) return;
  signalGroup(pid, 'SIGKILL');
  if (!(await observeRelease(pid)))
    throw new Error('Sign-in terminal descendants did not close');
};
