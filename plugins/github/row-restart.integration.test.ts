import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, attributedRowItemsOf } from './journey-calls-fixture';
import { journey, restart, type Journey } from './journey-fixture';
import { rowWaitMs } from './pull-row-reads';

const slow = 30_000;

const wait = 10_000;

const repository = 'owner/repository';

const icon = { sf: 'arrow.triangle.pull', material: 'merge_type' };

const rowOf = async (run: Journey): Promise<object[]> =>
  (await attributedRowItemsOf(run)).map(({ item }) => item);

// Holds every GitHub call until the returned function lets them through.
function stallGitHub(run: Journey): () => void {
  const { promise, resolve } = Promise.withResolvers<void>();

  run.github.stall.until = promise;

  return () => {
    run.github.stall.until = null;
    resolve();
  };
}

it(
  'keeps the number on the row after a restart while GitHub is slow, then fills in the details once it answers',
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 7, { title: 'Slow one' }));
    await attach(run, '#7');
    await restart(run);

    const answer = stallGitHub(run);
    const before = run.github.pullReads().length;
    const asked = rowOf(run);

    // The row waits once GitHub has been asked, so the clock moves only after the read began.
    await expect
      .poll(() => run.github.pullReads().length, { timeout: wait })
      .toBe(before + 1);
    await run.test.clock.advance(rowWaitMs);

    expect(await asked).toEqual([
      { icon, text: '#7', tooltip: 'Pull request #7' },
    ]);

    answer();

    await expect
      .poll(() => rowOf(run), { timeout: wait })
      .toEqual([
        {
          change: { stage: 'open' },
          icon,
          text: '#7',
          tone: 'success',
          tooltip: 'Slow one · Open',
        },
      ]);
  },
  slow,
);
