import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf, listed } from './journey-calls';
import { restart } from './journey-fixture';
import {
  attached,
  changePull,
  idOf,
  openChanges,
  refreshed,
  repository,
  tick,
} from './journey-watch';

const slow = 30_000;

const token = 'token-1';

it(
  'keeps what was last known when access is lost and says why, instead of closing the pull request or dropping its Checks; signing in again and retrying recovers it',
  async () => {
    const run = await attached(1);

    run.github.checks.set(`${repository}@${sha}`, [
      { name: 'build', status: 'completed', conclusion: 'success' },
    ]);

    const open = openChanges(run);

    await open.next();

    // GitHub no longer accepts the token, and meanwhile the pull request was closed there.
    run.github.accepted.delete(token);
    changePull(run, 1, { state: 'closed' });
    await tick(run);

    expect(await open.next()).toMatchObject([
      {
        stage: 'open',
        stale: 'signIn',
        checks: [{ name: 'build', state: 'passed' }],
      },
    ]);

    run.github.accepted.add(token);
    await refreshed(run);

    const [recovered] = await open.next();

    expect(recovered).toMatchObject({ stage: 'closed' });
    expect(recovered).not.toHaveProperty('stale');
  },
  slow,
);

it(
  'keeps what was last known through a network failure, marks it stale, and the explicit retry recovers it without waiting for the clock',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    await open.next();
    run.github.outage.status = 503;
    changePull(run, 1, { title: 'Renamed' });
    await tick(run);

    expect(await open.next()).toMatchObject([
      { title: 'Pull request 1', stage: 'open', stale: 'failed' },
    ]);
    expect(await listed(run)).toMatchObject({
      changes: [{ title: 'Pull request 1', stale: 'failed' }],
    });

    run.github.outage.status = undefined;

    expect(await refreshed(run)).toMatchObject({
      changes: [{ title: 'Renamed' }],
    });
    expect(await open.next()).toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);

it(
  'leaves out only the pull request that cannot be read, keeps the others, and still lists it with why; it returns when it can be read again',
  async () => {
    const run = await attached(1, 2, 3);

    await restart(run);
    run.github.pulls.delete(`${repository}#2`);

    expect(await changesOf(run)).toMatchObject([
      { id: idOf(1) },
      { id: idOf(3) },
    ]);
    expect(await listed(run)).toMatchObject({
      changes: [
        { id: idOf(1) },
        { repository, number: 2, error: expect.stringContaining('not found') },
        { id: idOf(3) },
      ],
    });

    changePull(run, 2, {});
    await refreshed(run);

    expect(await changesOf(run)).toMatchObject([
      { id: idOf(1) },
      { id: idOf(2) },
      { id: idOf(3) },
    ]);
  },
  slow,
);

it(
  'tells a failed first read from an empty one, keeps the association through it, and shows the pull request once access is back',
  async () => {
    const run = await attached(1);

    await restart(run);
    run.github.outage.status = 500;

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [{ repository, number: 1, error: expect.any(String) }],
    });

    run.github.outage.status = undefined;
    await refreshed(run);

    expect(await changesOf(run)).toMatchObject([{ id: idOf(1) }]);
  },
  slow,
);

it(
  'keeps showing a Session with nothing attached as empty, not as failed',
  async () => {
    const run = await attached();

    run.github.outage.status = 500;

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toEqual({ changes: [] });
  },
  slow,
);
