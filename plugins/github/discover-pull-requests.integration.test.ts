import { expect, it } from 'vitest';
import { headFrom, pullOf, type FixturePull } from './github-fixture';
import {
  attach,
  changesOf,
  discover,
  switchBranch,
  untilChanges,
  watchChanges,
} from './journey-calls';
import { journey } from './journey-fixture';

const slow = 30_000;

const own = 'github:owner/repository#12';

const ownRepository = 'owner/repository';

const laterBranch = 'feature-20';

const upstream = 'upstream/repository';

const ownReference = { repository: ownRepository, number: 12 };

const proposedUpstream = (
  number: number,
  owner: string,
): [string, FixturePull] =>
  pullOf(upstream, number, { head: headFrom(owner, 'feature-12') });

it(
  "attaches the pull requests of the Session's branch and shows them as soon as it runs",
  async () => {
    const run = await journey();
    const redraws = watchChanges(run);

    expect(await untilChanges(redraws, 0)).toEqual([]);
    expect(await discover(run)).toEqual({
      result: 'found',
      pullRequests: [ownReference],
    });
    expect(await untilChanges(redraws, 1)).toMatchObject([
      { id: own, stage: 'open' },
    ]);
  },
  slow,
);

it(
  'discovers the same pull request once however often it runs, and only ever reads GitHub',
  async () => {
    const run = await journey();
    const first = await discover(run);

    expect(await discover(run)).toEqual(first);
    await attach(run, 'owner/repository#12');

    expect(await changesOf(run)).toMatchObject([{ id: own }]);
    expect(
      run.github.requests
        .filter(({ host }) => host === 'api.github.com')
        .map(({ method }) => method),
    ).toEqual(expect.arrayContaining(['GET']));
    expect(
      run.github.requests
        .filter(({ host }) => host === 'api.github.com')
        .every(({ method }) => method === 'GET'),
    ).toBe(true);
    expect(run.github.listReads()[0]?.path).toContain('state=all');
  },
  slow,
);

it(
  'keeps earlier pull requests, merged ones too, after the branch switches',
  async () => {
    const run = await journey();

    const merged = pullOf(ownRepository, 20, {
      state: 'closed',
      merged: true,
      head: headFrom('owner', laterBranch),
    });

    const abandoned = pullOf(ownRepository, 21, {
      state: 'closed',
      head: headFrom('owner', laterBranch),
    });

    run.github.pulls.set(...merged);
    run.github.pulls.set(...abandoned);
    await discover(run);
    switchBranch(run, laterBranch);
    await discover(run);
    switchBranch(run, 'no-pull-request-here');

    expect(await discover(run)).toMatchObject({ result: 'no-match' });
    expect(await changesOf(run)).toMatchObject([
      { id: own, stage: 'open' },
      { id: 'github:owner/repository#20', stage: 'merged' },
      { id: 'github:owner/repository#21', stage: 'closed' },
    ]);
  },
  slow,
);

it(
  "finds a fork's pull request in the repository it targets, apart from a same-named branch of another fork",
  async () => {
    const run = await journey();

    run.github.parents.set(ownRepository, upstream);
    run.github.pulls.set(...proposedUpstream(7, 'owner'));
    run.github.pulls.set(...proposedUpstream(8, 'other'));
    run.github.pulls.set(...proposedUpstream(9, 'other'));
    run.github.pulls.set(...proposedUpstream(12, 'owner'));

    expect(await discover(run)).toEqual({
      result: 'found',
      pullRequests: [
        ownReference,
        { repository: upstream, number: 7 },
        { repository: upstream, number: 12 },
      ],
    });
    expect(await changesOf(run)).toMatchObject([
      { id: own },
      { id: 'github:upstream/repository#7' },
      { id: 'github:upstream/repository#12' },
    ]);
  },
  slow,
);
