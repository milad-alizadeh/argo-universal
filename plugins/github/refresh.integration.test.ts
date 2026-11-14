import { expect, it } from 'vitest';
import { attach } from './journey-calls-fixture';
import {
  attached,
  changePull,
  idOf,
  openChanges,
  pushed,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const renamed = 'Renamed';

it(
  'refreshes each visible pull request on its own, in the order attached, and shows one attached later, without reopening the Session',
  async () => {
    const run = await attached(3, 1, 2);
    const open = openChanges(run);
    const [third, , second] = await open.next();

    changePull(run, 1, {
      title: renamed,
      head: pushed(1),
      draft: true,
      mergeable_state: 'dirty',
    });
    await tick(run);

    // Only the pull request that changed differs; draft and conflict arrive together; the order is the order attached.
    const refreshed = await open.next();

    expect(refreshed).toMatchObject([
      { id: idOf(3) },
      { id: idOf(1), title: renamed, draft: true, conflict: true },
      { id: idOf(2) },
    ]);
    expect(refreshed[0]).toEqual(third);
    expect(refreshed[2]).toEqual(second);

    changePull(run, 4, { title: 'Fourth' });
    await attach(run, '#4');

    expect(await open.next()).toMatchObject([
      { id: idOf(3) },
      { id: idOf(1) },
      { id: idOf(2) },
      { id: idOf(4), title: 'Fourth' },
    ]);

    changePull(run, 2, { state: 'closed', merged: true });
    await tick(run);

    expect(await open.next()).toMatchObject([
      { id: idOf(3) },
      { id: idOf(1) },
      { id: idOf(2), stage: 'merged' },
      { id: idOf(4) },
    ]);
  },
  slow,
);
