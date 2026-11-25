import { expect, it } from 'vitest';
import { attach } from './journey-calls-fixture';
import { caller, journey, rowSlot } from './journey-fixture';
import { changePull, idOf, openChanges, tick } from './journey-watch-fixture';

const slow = 60_000;

it(
  'shows a pull request merged on GitHub in the Changes, the Session row and a second App within one Slot tick',
  async () => {
    const run = await journey();

    await attach(run, '#12');

    const first = openChanges(run);
    const second = openChanges(run);
    const row = openChanges(run, caller, rowSlot);

    await Promise.all([first.next(), second.next(), row.next()]);

    changePull(run, 12, { state: 'closed', merged: true });
    await tick(run);

    expect(await first.next()).toMatchObject([
      { id: idOf(12), stage: 'merged' },
    ]);
    expect(await second.next()).toMatchObject([
      { id: idOf(12), stage: 'merged' },
    ]);
    expect(await row.next()).toMatchObject([{ change: { stage: 'merged' } }]);
  },
  slow,
);
