import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// `released`: no member of the group is left. `unresolved`: one may remain, so recovery must not overlap it.
export type GroupRelease = 'released' | 'unresolved';

// How the operating system is asked about a group; only tests replace it.
export interface GroupPort {
  // Signals every member; a group that is already gone is not an error.
  kill: (group: number) => void;
  // True while any member could still run; a zombie awaiting its reaper does not count.
  hasLiveMember: (group: number) => boolean;
}

const releaseDeadlineMs = 5000;
const releasePollMs = 25;

// Only POSIX process groups are supported; the Engine leads its group, so its pid is the group id.
export const supportsProcessGroups = process.platform !== 'win32';

const errorCode = (error: unknown): unknown =>
  error instanceof Error && 'code' in error ? error.code : undefined;

// Signalling a zombie fails with EPERM on macOS, so liveness comes from member states, not from `kill(-group, 0)`.
const operatingSystem: GroupPort = {
  kill: (group): void => {
    try {
      process.kill(-group, 'SIGKILL');
    } catch (error) {
      if (errorCode(error) !== 'ESRCH' && errorCode(error) !== 'EPERM')
        throw error;
    }
  },
  hasLiveMember: (group): boolean => {
    try {
      const table = execFileSync(
        '/bin/ps',
        ['-A', '-o', 'pgid=', '-o', 'stat='],
        {
          encoding: 'utf8',
        },
      );
      return table.split('\n').some((line): boolean => {
        const [pgid, state] = line.trim().split(/\s+/);
        return Number(pgid) === group && !state?.startsWith('Z');
      });
    } catch {
      // Not knowing is not a release.
      return true;
    }
  },
};

/*
 * Kills every member of the group and waits until none can run, because a signal alone proves nothing.
 */
export async function releaseProcessGroup(
  group: number,
  options: { deadlineMs?: number; port?: GroupPort } = {},
): Promise<GroupRelease> {
  const port = options.port ?? operatingSystem;
  if (!supportsProcessGroups) return 'unresolved';
  if (!port.hasLiveMember(group)) return 'released';
  try {
    port.kill(group);
  } catch {
    return 'unresolved';
  }
  const deadline = Date.now() + (options.deadlineMs ?? releaseDeadlineMs);
  while (Date.now() < deadline) {
    if (!port.hasLiveMember(group)) return 'released';
    await sleep(releasePollMs);
  }
  return port.hasLiveMember(group) ? 'unresolved' : 'released';
}
