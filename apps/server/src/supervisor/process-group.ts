import { setTimeout as sleep } from 'node:timers/promises';

// `released`: no member of the group is left. `unresolved`: one may remain, so recovery must not overlap it.
export type GroupRelease = 'released' | 'unresolved';

const releaseDeadlineMs = 5000;
const releasePollMs = 25;

// Only POSIX process groups are supported; the Engine leads its group, so its pid is the group id.
export const supportsProcessGroups = process.platform !== 'win32';

const errorCode = (error: unknown): unknown =>
  error instanceof Error && 'code' in error ? error.code : undefined;

function isAlive(group: number): boolean {
  try {
    process.kill(-group, 0);
    return true;
  } catch (error) {
    // EPERM means a member exists that this process may not signal.
    return errorCode(error) === 'EPERM';
  }
}

// Kills every member of the group and waits until the operating system reports none, because a signal alone proves nothing.
export async function releaseProcessGroup(
  group: number,
  options: { deadlineMs?: number } = {},
): Promise<GroupRelease> {
  if (!supportsProcessGroups) return 'unresolved';
  if (!isAlive(group)) return 'released';
  try {
    process.kill(-group, 'SIGKILL');
  } catch (error) {
    if (errorCode(error) === 'ESRCH') return 'released';
    return 'unresolved';
  }
  const deadline = Date.now() + (options.deadlineMs ?? releaseDeadlineMs);
  while (Date.now() < deadline) {
    if (!isAlive(group)) return 'released';
    await sleep(releasePollMs);
  }
  return isAlive(group) ? 'unresolved' : 'released';
}
