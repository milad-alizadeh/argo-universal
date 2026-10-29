import type { ChildProcess } from 'node:child_process';
import { type Exit, hasExited } from './exit';
import { type GroupRelease, releaseProcessGroup } from './group';
import { stopGraceMs } from './timing';

type Release = () => Promise<GroupRelease>;

type Ladder = {
  child: ChildProcess;
  exited: Promise<Exit>;
  release: Release;
  graceMs: number;
};

// The grace timer and the stop share one release, so two never race on the same group.
const sharedRelease = (pid: number | undefined): Release => {
  let releasing: Promise<GroupRelease> | undefined;

  return (): Promise<GroupRelease> => {
    if (pid === undefined) return Promise.resolve('released');

    releasing ??= releaseProcessGroup(pid).finally((): void => {
      releasing = undefined;
    });

    return releasing;
  };
};

// SIGTERM first; past the grace, the whole group is killed.
const terminate = async (ladder: Ladder): Promise<void> => {
  ladder.child.kill('SIGTERM');
  const force = setTimeout((): void => void ladder.release(), ladder.graceMs);
  await ladder.exited;
  clearTimeout(force);
};

// Stops the child, then proves no member of its group is left, since a dead leader's descendants keep running.
const climb = async (ladder: Ladder): Promise<GroupRelease> => {
  if (!hasExited(ladder.child)) await terminate(ladder);

  return ladder.release();
};

// One stop per child: a second call answers with the first one's outcome.
export const stopper = (
  child: ChildProcess,
  exited: Promise<Exit>,
): ((graceMs?: number) => Promise<GroupRelease>) => {
  const release = sharedRelease(child.pid);
  let stopping: Promise<GroupRelease> | undefined;

  return (graceMs = stopGraceMs): Promise<GroupRelease> => {
    stopping ??= climb({ child, exited, release, graceMs });

    return stopping;
  };
};
