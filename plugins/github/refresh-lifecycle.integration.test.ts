import { expect, it } from 'vitest';
import { changesOf } from './journey-calls';
import { restart } from './journey-fixture';
import { attached, changePull, openChanges, tick } from './journey-watch';

const slow = 30_000;

const renamed = 'Renamed';

it(
  'shares one read of a pull request between the Workbench and the Inspector',
  async () => {
    const run = await attached(1);
    const workbench = openChanges(run);
    const inspector = openChanges(run);

    await workbench.next();
    await inspector.next();

    const pulls = run.github.pullReads().length;
    const checks = run.github.checkReads().length;

    changePull(run, 1, { title: renamed });
    await tick(run);
    await workbench.next();
    await inspector.next();

    expect(run.github.pullReads()).toHaveLength(pulls + 1);
    expect(run.github.checkReads()).toHaveLength(checks + 1);
  },
  slow,
);

it(
  'keeps asking while one list stays open after the other closes',
  async () => {
    const run = await attached(1);
    const workbench = openChanges(run);
    const inspector = openChanges(run);

    await workbench.next();
    await inspector.next();
    workbench.close();
    changePull(run, 1, { title: renamed });
    await tick(run);

    expect(await inspector.next()).toMatchObject([{ title: renamed }]);
  },
  slow,
);

it(
  'releases the refresh once the last open list closes: nothing asks GitHub again',
  async () => {
    const run = await attached(1);
    const first = openChanges(run);
    const second = openChanges(run);

    await first.next();
    await second.next();
    first.close();
    second.close();

    const reads = run.github.requests.length;

    await tick(run);
    await tick(run);

    expect(run.github.requests).toHaveLength(reads);
  },
  slow,
);

it(
  'starts no refresh of its own: nothing asks GitHub again while no list is open, even after a restart',
  async () => {
    const run = await attached(1);

    await restart(run);
    await changesOf(run);
    await tick(run);

    const reads = run.github.requests.length;

    await tick(run);
    await tick(run);

    expect(run.github.requests).toHaveLength(reads);
  },
  slow,
);
