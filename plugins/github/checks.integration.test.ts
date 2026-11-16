import { expect, it } from 'vitest';
import { headFrom, sha } from './github-fixture';
import { changesOf, listed } from './journey-calls-fixture';
import { restart } from './journey-fixture';
import {
  attached,
  changePull,
  newHead,
  openChanges,
  pushed,
  refreshed,
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const build = 'build';

const wait = 10_000;

const checksOf = (head: string): string => `${repository}@${head}`;

it(
  'shows each Check by name and result as it moves, reads odd conclusions safely, and follows a push to the new head',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    expect(await open.next()).toMatchObject([{ checks: [] }]);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'in_progress', conclusion: null },
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'failure' },
      { name: 'stopped', status: 'completed', conclusion: 'cancelled' },
      { name: 'skip', status: 'completed', conclusion: 'skipped' },
      { name: 'later', status: 'queued', conclusion: null },
    ]);
    await tick(run);

    expect(await open.next()).toMatchObject([
      {
        checks: [
          { name: build, state: 'running' },
          { name: 'lint', state: 'passed' },
          { name: 'test', state: 'failed' },
          { name: 'stopped', state: 'failed' },
          { name: 'skip', state: 'passed' },
          { name: 'later', state: 'running' },
        ],
      },
    ]);

    changePull(run, 1, { head: pushed(1) });
    run.github.checks.set(checksOf(newHead), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    await tick(run);

    expect(await open.next()).toMatchObject([
      { head: newHead, checks: [{ name: build, state: 'passed' }] },
    ]);
  },
  slow,
);

const otherHead = 'abcdef0123456789abcdef0123456789abcdef01';

it(
  'tells Checks GitHub says are none (an empty list) from Checks that could not be read (none given), per pull request, keeping the last known through a failed refresh',
  async () => {
    const run = await attached(1, 2);

    changePull(run, 2, {
      head: { ...headFrom('owner', 'feature-2'), sha: otherHead },
    });
    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    run.github.checks.set(checksOf(otherHead), [
      { name: 'lint', status: 'completed', conclusion: 'success' },
    ]);
    await refreshed(run);

    // An open list holds Argo's clock, which is what makes a read due.
    await openChanges(run).next();

    // Only the first pull request's Checks cannot be read; the second keeps reading its own.
    run.github.checksFailWith.set(checksOf(sha), 500);
    run.github.checks.set(checksOf(otherHead), [
      { name: 'lint', status: 'in_progress', conclusion: null },
    ]);
    await tick(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([
        { stale: 'failed', checks: [{ name: build, state: 'passed' }] },
        { checks: [{ name: 'lint', state: 'running' }] },
      ]);

    const [, second] = await changesOf(run);

    expect(second).not.toHaveProperty('stale');

    // A push to a head whose Checks were never read leaves none to claim, never passing ones.
    run.github.checksFailWith.set(checksOf(newHead), 500);
    changePull(run, 1, { head: pushed(1) });
    await tick(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ head: newHead, stale: 'failed' }, {}]);

    const [moved] = await changesOf(run);

    expect(moved).not.toHaveProperty('checks');

    // Nothing can be read after a restart: each is listed as it was last read and says so, and no Checks are made up.
    await restart(run);
    run.github.failWith.status = 502;

    expect(await listed(run)).toMatchObject({
      changes: [{ head: newHead, stale: 'failed' }, { stale: 'failed' }],
    });

    const [kept] = await changesOf(run);

    expect(kept).toMatchObject({ head: newHead, stale: 'failed' });
    expect(kept).not.toHaveProperty('checks');
  },
  slow,
);
