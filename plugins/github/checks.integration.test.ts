import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf, listed } from './journey-calls';
import { restart } from './journey-fixture';
import {
  attached,
  changePull,
  newHead,
  openChanges,
  pushed,
  repository,
  tick,
} from './journey-watch';

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

it(
  'tells Checks GitHub says are none (an empty list) from Checks that could not be read (none given), and keeps the last known through a failed refresh',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    await open.next();

    run.github.checksFailWith.status = 500;
    run.github.checks.set(checksOf(sha), []);
    await tick(run);

    expect(await open.next()).toMatchObject([
      { stale: 'failed', checks: [{ name: build, state: 'passed' }] },
    ]);

    changePull(run, 1, { head: pushed(1) });
    await tick(run);

    const [moved] = await open.next();

    expect(moved).toMatchObject({ head: newHead, stale: 'failed' });
    expect(moved).not.toHaveProperty('checks');

    // Nothing of the pull request could be read after a restart, so there are no Checks to claim and no Change to claim them for.
    await restart(run);
    run.github.failWith.status = 502;

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [{ number: 1, error: expect.any(String) }],
    });
  },
  slow,
);
