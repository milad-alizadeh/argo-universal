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
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const build = 'build';

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
    const open = openChanges(run);

    changePull(run, 2, {
      head: { ...headFrom('owner', 'feature-2'), sha: otherHead },
    });
    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    run.github.checks.set(checksOf(otherHead), [
      { name: 'lint', status: 'completed', conclusion: 'success' },
    ]);
    await open.next();

    // Only the first pull request's Checks cannot be read; the second keeps reading its own.
    run.github.checksFailWith.set(checksOf(sha), 500);
    run.github.checks.set(checksOf(otherHead), [
      { name: 'lint', status: 'in_progress', conclusion: null },
    ]);
    await tick(run);

    const [first, second] = await open.next();

    expect(first).toMatchObject({
      stale: 'failed',
      checks: [{ name: build, state: 'passed' }],
    });
    expect(second).toMatchObject({
      checks: [{ name: 'lint', state: 'running' }],
    });
    expect(second).not.toHaveProperty('stale');

    // A push to a head whose Checks were never read leaves none to claim, never passing ones.
    run.github.checksFailWith.set(checksOf(newHead), 500);
    changePull(run, 1, { head: pushed(1) });
    await tick(run);

    const [moved] = await open.next();

    expect(moved).toMatchObject({ head: newHead, stale: 'failed' });
    expect(moved).not.toHaveProperty('checks');

    // Nothing of the pull requests could be read after a restart, so there are no Checks to claim and no Change to claim them for.
    await restart(run);
    run.github.failWith.status = 502;

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [
        { number: 1, error: expect.any(String) },
        { number: 2, error: expect.any(String) },
      ],
    });
  },
  slow,
);
