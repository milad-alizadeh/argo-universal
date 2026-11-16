import { expect, it } from 'vitest';
import { attach, changesOf } from './journey-calls-fixture';
import { journey, restart, type Journey } from './journey-fixture';
import {
  attached,
  changePull,
  openChanges,
  tick,
} from './journey-watch-fixture';

const slow = 30_000;

const wait = 10_000;

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
  'answers a Change as it was last read while GitHub is slow on the clock, then shows what GitHub answers',
  async () => {
    const run = await attached(1);

    // An open list holds Argo's clock, which is what makes a read due.
    await openChanges(run).next();
    changePull(run, 1, { title: 'First' });
    await tick(run);
    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ title: 'First' }]);

    const answer = stallGitHub(run);

    changePull(run, 1, { title: 'Renamed' });
    await tick(run);

    expect(await changesOf(run)).toMatchObject([{ title: 'First' }]);

    answer();

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);

it(
  'answers the Changes as last read straight after a restart while GitHub is slow, then what GitHub answers',
  async () => {
    const run = await journey();

    await attach(run, '#12');
    await restart(run);

    const answer = stallGitHub(run);

    changePull(run, 12, { title: 'Renamed' });

    // The record outlives the worker, so the Changes are never empty while GitHub is slow.
    expect(await changesOf(run)).toMatchObject([
      { pullRequest: { number: 12 } },
    ]);

    answer();

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);
