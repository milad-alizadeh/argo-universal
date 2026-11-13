import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, changesOf, detach, idsOf } from './journey-calls';
import { journey, restart } from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const owned = `${repository}#12`;

const forked = 'fork-owner/repository#12';

const ownedId = `github:${owned}`;

it(
  'keeps every association, with its repository, across a branch switch and a Server restart',
  async () => {
    const run = await journey();

    await attach(run, owned);
    await attach(run, forked);
    await restart(run, 'another-branch');

    expect(await idsOf(run)).toEqual([ownedId, `github:${forked}`]);

    await restart(run, null);

    expect(await idsOf(run)).toHaveLength(2);
  },
  slow,
);

it(
  'keeps a detach across a restart',
  async () => {
    const run = await journey();

    await attach(run, owned);
    await attach(run, forked);
    await detach(run, forked);
    await restart(run);

    expect(await idsOf(run)).toEqual([ownedId]);
  },
  slow,
);

it(
  'keeps Merged and Closed pull requests listed until they are detached',
  async () => {
    const run = await journey();
    const merged = pullOf(repository, 2, { state: 'closed', merged: true });

    run.github.pulls.set(...merged);
    run.github.pulls.set(...pullOf(repository, 3, { state: 'closed' }));

    for (const number of [12, 2, 3]) await attach(run, `#${number}`);

    await restart(run, 'next-change');

    expect(await changesOf(run)).toMatchObject([
      { stage: 'open' },
      { stage: 'merged' },
      { stage: 'closed' },
    ]);

    await detach(run, '#2');

    expect(await changesOf(run)).toMatchObject([
      { stage: 'open' },
      { stage: 'closed' },
    ]);
  },
  slow,
);
