import type { ChildProcess } from 'node:child_process';
import { type ExitWatch, isAlive, signalStop } from './exit';
import {
  type GroupRelease,
  processGroupOf,
  releaseProcessGroup,
} from './group';
import { once } from './once';
import { pollUntil } from './poll';
import { releaseDeadlineMs } from './timing';

// What the ladder needs from a process: its group, whether it still runs, how to ask it to stop, and when it has.
type Stoppable = {
  group: number;
  running: () => boolean;
  terminate: () => void;
  exited: () => Promise<void>;
};

type Release = () => Promise<GroupRelease>;

// The grace timer and the final check share one release, so two never race on the same group.
const terminate = async (
  target: Stoppable,
  release: Release,
  graceMs: number,
): Promise<void> => {
  target.terminate();
  const force = setTimeout((): void => void release(), graceMs);
  await target.exited();
  clearTimeout(force);
};

// Releases the group last, since a dead leader's descendants keep running.
const climb = async (
  target: Stoppable,
  graceMs: number,
): Promise<GroupRelease> => {
  const release = once((): Promise<GroupRelease> =>
    releaseProcessGroup(target.group),
  );

  if (target.running()) await terminate(target, release, graceMs);

  return release();
};

// A child started here leads its own group, so its pid is the group id.
const childTarget = (
  child: ChildProcess,
  group: number,
  exit: ExitWatch,
): Stoppable => ({
  group,
  running: (): boolean => exit.ended() === undefined,
  terminate: (): void => void child.kill('SIGTERM'),
  exited: async (): Promise<void> => {
    await exit.exited;
  },
});

export const stopChild = (
  child: ChildProcess,
  exit: ExitWatch,
  graceMs: number,
): Promise<GroupRelease> =>
  child.pid === undefined
    ? Promise.resolve('released')
    : climb(childTarget(child, child.pid, exit), graceMs);

// Bounded, so a process that outlives its group kill still ends the wait.
const goneWithin = async (pid: number, limitMs: number): Promise<void> => {
  await pollUntil(
    (): true | undefined => (isAlive(pid) ? undefined : true),
    `Process ${pid} did not stop`,
    limitMs,
  ).catch((): undefined => undefined);
};

const processTarget = (
  pid: number,
  group: number,
  graceMs: number,
): Stoppable => ({
  group,
  running: (): boolean => isAlive(pid),
  terminate: (): void => signalStop(pid),
  exited: (): Promise<void> => goneWithin(pid, graceMs + releaseDeadlineMs),
});

/*
 * Stops a process this one did not start, by its pid, on the same ladder as a ChildHandle: SIGTERM, its group killed after `graceMs`,
 * then `released` once no member is left. A process in this one's own group is only asked to stop, and answers `unresolved`.
 */
export async function stopProcess(
  pid: number,
  graceMs: number,
): Promise<GroupRelease> {
  const group = processGroupOf(pid);

  if (group === undefined || group === processGroupOf(process.pid)) {
    signalStop(pid);

    return 'unresolved';
  }

  return climb(processTarget(pid, group, graceMs), graceMs);
}
