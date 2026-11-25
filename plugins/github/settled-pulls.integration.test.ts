import { expect, it } from 'vitest';
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
    await run.test.settled();
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

// GitHub refusing every read, as it does while the network is down or the rate limit is spent.
const unavailable = 503;

// A failed read must not undo what a Closed pull request's last good read said: each one that did read it again on every draw.
it(
  'asks GitHub nothing more for a Closed pull request whose latest read failed, and shows it as last read',
  async () => {
    const run = await attached(1, 2);

    changePull(run, 1, { state: 'closed' });
    await refreshed(run);

    run.github.failWith.status = unavailable;
    await refreshed(run);

    const shown = await openChanges(run).next();
    expect(shown).toMatchObject([
      { id: idOf(1), stage: 'closed' },
      { id: idOf(2), stage: 'open', stale: 'failed' },
    ]);
    expect(shown[0]).not.toHaveProperty('stale');
    await run.test.settled();
    const [closedReads, openReads] = [readsOf(run, 1), readsOf(run, 2)];

    // Time passes and the App draws the Changes again, as each Session row and Inspector does.
    for (const _ of [1, 2]) {
      await tick(run);
      await openChanges(run).next();
      await run.test.settled();
    }

    expect(readsOf(run, 1)).toBe(closedReads);
    expect(readsOf(run, 2)).toBeGreaterThan(openReads);
  },
  slow,
);
