import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { changesOf, listed } from './journey-calls';
import { project, restart, secondSessionId } from './journey-fixture';
import {
  attached,
  changePull,
  idOf,
  openChanges,
  refreshed,
  repository,
  tick,
} from './journey-watch';

const slow = 60_000;

const token = 'token-1';

const second = { sessionId: secondSessionId, projectId: project.id };

it(
  'keeps what was last known through lost access and a network failure, says why, and recovers on sign-in and on the explicit retry',
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

    run.github.failWith.status = 503;
    changePull(run, 1, { title: 'Renamed' });
    await tick(run);

    expect(await open.next()).toMatchObject([
      { stage: 'closed', stale: 'failed' },
    ]);
    expect(await listed(run)).toMatchObject({
      changes: [{ stage: 'closed', stale: 'failed' }],
    });

    run.github.failWith.status = null;

    expect(await refreshed(run)).toMatchObject({
      changes: [{ title: 'Renamed' }],
    });
    expect(await open.next()).toMatchObject([{ title: 'Renamed' }]);
  },
  slow,
);

it(
  'leaves out only the pull request that cannot be read, tells a failed first read from an empty one, and shows it once it can be read again',
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

    // Everything fails on a fresh start: that is an error, not an empty Session, and the associations stay.
    await restart(run);
    run.github.failWith.status = 500;

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [{ error: expect.any(String) }, {}, {}],
    });

    // A Session with nothing attached is empty, not failed, however GitHub is doing.
    expect(await listed(run, second)).toEqual({ changes: [] });

    run.github.failWith.status = null;
    await refreshed(run);

    expect(await changesOf(run)).toHaveLength(3);
  },
  slow,
);
