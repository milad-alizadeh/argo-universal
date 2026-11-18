import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf, listed } from './journey-calls-fixture';
import { project, restart, secondSessionId } from './journey-fixture';
import {
  attached,
  changePull,
  idOf,
  openChanges,
  refreshed,
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

const token = 'token-1';

const second = { sessionId: secondSessionId, projectId: project.id };

const wait = 10_000;

it(
  'keeps what was last known through lost access and a network failure, says why, and recovers on sign-in and on the explicit retry',
  async () => {
    const run = await attached(1);

    run.github.checks.set(`${repository}@${sha}`, [
      { name: 'build', status: 'completed', conclusion: 'success' },
    ]);
    await refreshed(run);

    // An open list holds Argo's clock, which is what makes a read due.
    await openChanges(run).next();

    /*
     * GitHub no longer accepts the token, and meanwhile the pull request was renamed there; it stays open, as a closed
     * one is settled and not asked for again (#2197).
     */
    run.github.accepted.delete(token);
    changePull(run, 1, { title: 'Moved' });
    await tick(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([
        {
          stage: 'open',
          stale: 'signIn',
          checks: [{ name: 'build', state: 'passed' }],
        },
      ]);

    run.github.accepted.add(token);
    await refreshed(run);

    const [recovered] = await changesOf(run);

    expect(recovered).toMatchObject({ stage: 'open', title: 'Moved' });
    expect(recovered).not.toHaveProperty('stale');

    run.github.failWith.status = 503;
    changePull(run, 1, { title: 'Renamed' });
    await tick(run);

    await expect
      .poll(() => changesOf(run), { timeout: wait })
      .toMatchObject([{ title: 'Moved', stale: 'failed' }]);
    expect(await listed(run)).toMatchObject({
      changes: [{ title: 'Moved', stale: 'failed' }],
    });

    run.github.failWith.status = null;

    expect(await refreshed(run)).toMatchObject({
      changes: [{ title: 'Renamed' }],
    });
    expect(await changesOf(run)).toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);

it(
  'keeps a pull request that cannot be read as it was last read, marked stale, through a restart, and clears the mark once it reads again',
  async () => {
    const run = await attached(1, 2, 3);

    await restart(run);
    run.github.pulls.delete(`${repository}#2`);

    // The record outlives the worker, so nothing is left out while GitHub cannot be read.
    expect(await listed(run)).toMatchObject({
      changes: [
        { id: idOf(1) },
        { id: idOf(2), stale: 'failed' },
        { id: idOf(3) },
      ],
    });
    expect(await changesOf(run)).toMatchObject([
      { id: idOf(1) },
      { id: idOf(2), stale: 'failed' },
      { id: idOf(3) },
    ]);

    changePull(run, 2, {});
    await refreshed(run);

    const [, mended] = await changesOf(run);

    expect(mended).toMatchObject({ id: idOf(2) });
    expect(mended).not.toHaveProperty('stale');

    // Everything fails on a fresh start: each is still listed as last read, and each says it is stale.
    await restart(run);
    run.github.failWith.status = 500;

    expect(await listed(run)).toMatchObject({
      changes: [{ stale: 'failed' }, { stale: 'failed' }, { stale: 'failed' }],
    });
    expect(await changesOf(run)).toHaveLength(3);

    // A Session with nothing attached is empty, not failed, however GitHub is doing.
    expect(await listed(run, second)).toEqual({ changes: [] });

    run.github.failWith.status = null;

    expect(await refreshed(run)).not.toMatchObject({
      changes: [{ stale: 'failed' }, {}, {}],
    });
    expect(await changesOf(run)).toHaveLength(3);
  },
  slow,
);
