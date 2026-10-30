import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { releaseDeadlineMs, releasePollMs } from './timing';

// `released`: no member of the group is left. `unresolved`: one may remain, so recovery must not overlap it.
export type GroupRelease = 'released' | 'unresolved';

// How the operating system is asked about a group; only tests replace it.
export interface GroupPort {
  // Signals every member; a group that is already gone is not an error.
  kill: (group: number) => void;
  // True while any member could still run; a zombie awaiting its reaper does not count.
  hasLiveMember: (group: number) => boolean;
}

// Only POSIX process groups are supported; a child started here leads its group, so its pid is the group id.
export const supportsProcessGroups = process.platform !== 'win32';

// The group a running process belongs to; undefined once it is gone.
export function processGroupOf(pid: number): number | undefined {
  try {
    const group = execFileSync('/bin/ps', ['-o', 'pgid=', '-p', String(pid)], {
      encoding: 'utf8',
    });

    return Number(group.trim());
  } catch {
    return undefined;
  }
}

const goneGroupCodes = new Set<unknown>(['ESRCH', 'EPERM']);

// The group is already gone, or holds only zombies, which a kill cannot reach.
const isGoneGroupError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error && goneGroupCodes.has(error.code);

// Signalling a zombie fails with EPERM on macOS, so liveness comes from member states, not from `kill(-group, 0)`.
const operatingSystem: GroupPort = {
  kill: (group): void => {
    try {
      process.kill(-group, 'SIGKILL');
    } catch (error) {
      if (!isGoneGroupError(error)) throw error;
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

      return tableHasLiveMember(table, group);
    } catch {
      // Not knowing is not a release.
      return true;
    }
  },
};

const tableHasLiveMember = (table: string, group: number): boolean =>
  table.split('\n').some((line): boolean => {
    const [pgid, state] = line.trim().split(/\s+/);

    return Number(pgid) === group && !state?.startsWith('Z');
  });

/*
 * Kills every member of the group and waits until none can run, because a signal alone proves nothing.
 */
export async function releaseProcessGroup(
  group: number,
  options: { deadlineMs?: number; port?: GroupPort } = {},
): Promise<GroupRelease> {
  if (!supportsProcessGroups) return 'unresolved';

  return releaseSupportedGroup(group, options);
}

const releaseSupportedGroup = async (
  group: number,
  options: { deadlineMs?: number; port?: GroupPort },
): Promise<GroupRelease> => {
  const port = options.port ?? operatingSystem;
  const duration = options.deadlineMs ?? releaseDeadlineMs;

  return releaseLiveGroup(group, port, duration);
};

const releaseLiveGroup = async (
  group: number,
  port: GroupPort,
  duration: number,
): Promise<GroupRelease> => {
  if (!port.hasLiveMember(group)) return 'released';

  if (!killGroup(port, group)) return 'unresolved';

  return waitForRelease(port, group, Date.now() + duration);
};

const killGroup = (port: GroupPort, group: number): boolean => {
  try {
    port.kill(group);

    return true;
  } catch {
    return false;
  }
};

const waitForRelease = async (
  port: GroupPort,
  group: number,
  deadline: number,
): Promise<GroupRelease> => {
  while (Date.now() < deadline) {
    if (!port.hasLiveMember(group)) return 'released';
    await sleep(releasePollMs);
  }

  return finalReleaseStatus(port, group);
};

const finalReleaseStatus = (port: GroupPort, group: number): GroupRelease =>
  port.hasLiveMember(group) ? 'unresolved' : 'released';
