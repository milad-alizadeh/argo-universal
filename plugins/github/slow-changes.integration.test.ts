import { expect, it } from 'vitest';
import { attach, changesOf } from './journey-calls-fixture';
import { journey, restart, type Journey } from './journey-fixture';
import {
  attached,
  changePull,
  openChanges,
  tick,
} from './journey-watch-fixture';
import { rowWaitMs } from './pull-row-reads';

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

// The Changes a list asks for while GitHub holds its answer: asked once the read began, answered once the wait is over.
async function askedWhileSlow(run: Journey, reads: number): Promise<object[]> {
  const asked = changesOf(run);

  await expect
    .poll(() => run.github.pullReads().length, { timeout: wait })
    .toBe(reads);
  await run.test.clock.advance(rowWaitMs);

  return asked;
}

it(
  'keeps a Change as it was last read while GitHub is slow on the clock, then shows what GitHub answers',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    changePull(run, 1, { title: 'First' });
    await tick(run);

    expect(await open.next()).toMatchObject([{ title: 'First' }]);

    const answer = stallGitHub(run);
    const reads = run.github.pullReads().length + 1;

    changePull(run, 1, { title: 'Renamed' });
    await tick(run);

    expect(await askedWhileSlow(run, reads)).toMatchObject([
      { title: 'First' },
    ]);

    answer();

    expect(await open.next()).toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);

it(
  'answers no Changes after a restart while GitHub is slow, then shows them once it answers',
  async () => {
    const run = await journey();

    await attach(run, '#12');
    await restart(run);

    const answer = stallGitHub(run);
    const reads = run.github.pullReads().length + 1;

    expect(await askedWhileSlow(run, reads)).toEqual([]);

    answer();

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ pullRequest: { number: 12 } }]);
  },
  slow,
);
