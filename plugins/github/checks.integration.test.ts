import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf, listed } from './journey-calls';
import { restart } from './journey-fixture';
import {
  attached,
  changePull,
  newHead,
  openChanges,
  repository,
  tick,
} from './journey-watch';

const slow = 30_000;

const build = 'build';

const checksOf = (head: string): string => `${repository}@${head}`;

it(
  'shows each Check by name and result as it moves from running to passed',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    await open.next();
    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'in_progress', conclusion: null },
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'failure' },
    ]);
    await tick(run);

    expect(await open.next()).toMatchObject([
      {
        checks: [
          { name: build, state: 'running' },
          { name: 'lint', state: 'passed' },
          { name: 'test', state: 'failed' },
        ],
      },
    ]);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'success' },
    ]);
    await tick(run);

    expect(await open.next()).toMatchObject([
      {
        checks: [
          { name: build, state: 'passed' },
          { name: 'lint', state: 'passed' },
          { name: 'test', state: 'passed' },
        ],
      },
    ]);
  },
  slow,
);

it(
  "shows a pushed head's Checks instead of the old head's",
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    await open.next();
    changePull(run, 1, { head: { ref: 'feature-1', sha: newHead } });
    run.github.checks.set(checksOf(newHead), [
      { name: build, status: 'queued', conclusion: null },
    ]);
    await tick(run);

    expect(await open.next()).toMatchObject([
      { head: newHead, checks: [{ name: build, state: 'running' }] },
    ]);
  },
  slow,
);

it.each([
  ['cancelled', 'cancelled', 'failed'],
  ['skipped', 'skipped', 'passed'],
  ['neutral', 'neutral', 'passed'],
] as const)(
  'reads a %s Check as %s, and one that has not completed as running',
  async (_name, conclusion, state) => {
    const run = await attached(1);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion },
      { name: 'later', status: 'queued', conclusion: null },
    ]);

    expect(await changesOf(run)).toMatchObject([
      {
        checks: [
          { name: build, state },
          { name: 'later', state: 'running' },
        ],
      },
    ]);
  },
  slow,
);

it(
  'tells a commit GitHub says has no Checks (an empty list) from Checks that could not be read (none given)',
  async () => {
    const run = await attached(1);

    expect(await changesOf(run)).toMatchObject([{ checks: [] }]);

    await restart(run);
    run.github.outage.status = 502;

    // The pull request cannot be read, so there are no Checks to claim and no Change to claim them for.
    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [{ number: 1, error: expect.any(String) }],
    });
  },
  slow,
);

it(
  'keeps the Checks last known when only a refresh of them fails, marked stale, and gives none for a head it never read',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    run.github.checks.set(checksOf(sha), [
      { name: build, status: 'completed', conclusion: 'success' },
    ]);
    await open.next();

    run.github.checksOutage.status = 500;
    run.github.checks.set(checksOf(sha), []);
    await tick(run);

    expect(await open.next()).toMatchObject([
      { stale: 'failed', checks: [{ name: build, state: 'passed' }] },
    ]);

    changePull(run, 1, { head: { ref: 'feature-1', sha: newHead } });
    await tick(run);

    const [pushed] = await open.next();

    expect(pushed).toMatchObject({ head: newHead, stale: 'failed' });
    expect(pushed).not.toHaveProperty('checks');
  },
  slow,
);
