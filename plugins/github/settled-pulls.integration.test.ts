import { expect, it } from 'vitest';
import { settled } from './journey-fixture';
import {
  attached,
  changePull,
  idOf,
  openChanges,
  refreshed,
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const pathOf = (number: number): string =>
  `/repos/${repository}/pulls/${number}`;

type Run = Awaited<ReturnType<typeof attached>>;

const readsOf = (run: Run, number: number): number =>
  run.github.pullReads().filter(({ path }) => path === pathOf(number)).length;

// A Closed pull request cannot change under a list that draws it again, so the list does not ask GitHub for it each time.
it(
  'asks GitHub nothing more for a Closed pull request when the Changes list is asked again, and for an Open one it does',
  async () => {
    const run = await attached(1, 2);

    changePull(run, 1, { state: 'closed' });
    await refreshed(run);

    const open = openChanges(run);
    expect(await open.next()).toMatchObject([
      { id: idOf(1), stage: 'closed' },
      { id: idOf(2), stage: 'open' },
    ]);
    await settled(run);
    const [closedReads, openReads] = [readsOf(run, 1), readsOf(run, 2)];

    expect(closedReads).toBeGreaterThan(1);

    changePull(run, 2, { title: 'Renamed' });
    await tick(run);

    expect(await open.next()).toMatchObject([
      { id: idOf(1), stage: 'closed' },
      { id: idOf(2), title: 'Renamed' },
    ]);
    expect(readsOf(run, 2)).toBeGreaterThan(openReads);
    expect(readsOf(run, 1)).toBe(closedReads);
  },
  slow,
);
