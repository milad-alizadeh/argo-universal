import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { processGroupMembers } from '../../lib/process-group-members';

const releaseLimitMs = 1000;

const observationIntervalMs = 25;

const Missing = z.object({ code: z.literal('ESRCH') });

export const killShellGroup = (pid: number): void => {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch (error) {
    if (!Missing.safeParse(error).success) throw error;
  }
};

export const releaseShellGroup = async (pid: number): Promise<void> => {
  killShellGroup(pid);
  const deadline = Date.now() + releaseLimitMs;

  while (processGroupMembers(pid).length > 0) {
    if (Date.now() >= deadline)
      throw new Error('Shell process group did not close');
    await delay(observationIntervalMs);
  }
};
