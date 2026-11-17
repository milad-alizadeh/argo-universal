import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf } from './journey-calls-fixture';
import {
  attached,
  changePull,
  refreshed,
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const wait = 10_000;

const tooManyRequests = 429;

// Core's fetch keeps a rate-limited origin closed this long when GitHub does not say until when.
const backoffMs = 60_000;

it(
  'keeps a rate-limited pull request as last read and says so, asks GitHub nothing more until the limit resets, then reads again',
  async () => {
    const run = await attached(1);

    run.github.checks.set(`${repository}@${sha}`, [
      { name: 'build', status: 'completed', conclusion: 'success' },
    ]);
    await refreshed(run);

    run.github.failWith.status = tooManyRequests;
    changePull(run, 1, { title: 'Renamed' });
    await refreshed(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ stage: 'open', stale: 'rateLimited' }]);

    // The origin is closed: the next asks answer from core without reaching GitHub.
    const asked = run.github.pullReads().length;

    await tick(run);
    await refreshed(run);
    expect(run.github.pullReads()).toHaveLength(asked);

    run.github.failWith.status = null;
    await run.test.clock.advance(backoffMs);
    await refreshed(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ title: 'Renamed' }]);
    expect((await changesOf(run))[0]).not.toHaveProperty('stale');
  },
  slow,
);
