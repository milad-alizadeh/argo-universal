import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, changesOf, listed } from './journey-calls-fixture';
import { caller, journey, restart } from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const pullReference = `${repository}#12`;

it(
  'tells Open, draft, conflicting, Merged and Closed pull requests apart',
  async () => {
    const run = await journey();

    const pulls = [
      pullOf(repository, 1, { draft: true, mergeable_state: 'dirty' }),
      pullOf(repository, 2, { state: 'closed', merged: true }),
      pullOf(repository, 3, { state: 'closed' }),
    ];

    for (const [key, pull] of pulls) run.github.pulls.set(key, pull);

    for (const number of [1, 2, 3]) await attach(run, `#${number}`);

    expect(await changesOf(run)).toMatchObject([
      { stage: 'open', draft: true, conflict: true },
      { stage: 'merged' },
      { stage: 'closed' },
    ]);
  },
  slow,
);

it(
  'lists a Session with nothing attached as an empty list, which a failed read is told apart from',
  async () => {
    const run = await journey();

    expect(await listed(run)).toEqual({ changes: [] });
  },
  slow,
);

it(
  'keeps an attached pull request across a Server restart, in the Slot and in the list',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    await restart(run);

    expect(await changesOf(run)).toMatchObject([
      { id: 'github:owner/repository#12', title: 'Add the thing' },
    ]);
    expect(await listed(run)).toMatchObject({
      changes: [{ id: 'github:owner/repository#12' }],
    });
  },
  slow,
);

it(
  'keeps an earlier association when the Session starts work on another pull request',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    await attach(run, 'fork-owner/repository#12');
    await restart(run);

    expect(await changesOf(run)).toHaveLength(2);
  },
  slow,
);

it(
  'lists the pull request it could not read after a restart with the reason, which is not an empty list',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    run.github.pulls.delete(pullReference);
    await restart(run);

    const failed = await listed(run);

    expect(failed).toEqual({
      changes: [
        {
          repository,
          number: 12,
          error: expect.stringContaining('not found'),
        },
      ],
    });
    expect(failed).not.toEqual(
      await listed(run, { ...caller, sessionId: 'session-2' }),
    );
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  'degrades to a sign-in error, not to an empty list, when the Account stops being accepted after attaching',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    await restart(run);
    run.github.accepted.clear();

    expect(await listed(run)).toEqual({
      changes: [
        { repository, number: 12, error: expect.stringContaining('Sign in') },
      ],
    });
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  'leaves out a Change the Changes Slot rejects while the Plugin still lists it',
  async () => {
    const run = await journey();
    const oversized = 'x'.repeat(400);

    run.github.pulls.set(...pullOf(repository, 5, { title: oversized }));
    await attach(run, '#5');

    expect(await changesOf(run)).toEqual([]);
    expect(await listed(run)).toMatchObject({
      changes: [{ title: oversized }],
    });
  },
  slow,
);
