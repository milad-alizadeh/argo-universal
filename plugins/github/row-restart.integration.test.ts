import type { SessionRowItem } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, attributedRowItemsOf } from './journey-calls-fixture';
import { journey, restart, type Journey } from './journey-fixture';

const slow = 30_000;

const wait = 10_000;

const repository = 'owner/repository';

const icon = { sf: 'arrow.triangle.pull', material: 'merge_type' } as const;

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

const openRow = (title: string): SessionRowItem => ({
  icon,
  text: '#7',
  tone: 'success',
  tooltip: `${title} · Open`,
  change: { stage: 'open' },
});

it(
  'draws the row as it was last read straight after a restart while GitHub is slow, then what GitHub answers',
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 7, { title: 'Slow one' }));
    await attach(run, '#7');
    await restart(run);

    const answer = stallGitHub(run);

    run.github.pulls.set(...pullOf(repository, 7, { title: 'Renamed' }));

    // The record outlives the worker, so the row never waits on GitHub and never falls back to a bare number.
    expect(await rowOf(run)).toEqual([openRow('Slow one')]);

    answer();

    await expect
      .poll(() => rowOf(run), { timeout: wait })
      .toEqual([openRow('Renamed')]);
  },
  slow,
);
