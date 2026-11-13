import { expect, it } from 'vitest';
import { headFrom, pullOf, type FixturePull } from './github-fixture';
import { attach, changesOf, discover, switchBranch } from './journey-calls';
import { journey } from './journey-fixture';

const slow = 30_000;

const own = 'github:owner/repository#12';

const ownRepository = 'owner/repository';

const upstream = 'upstream/repository';

const ownReference = { repository: ownRepository, number: 12 };

const proposedUpstream = (
  number: number,
  owner: string,
): [string, FixturePull] =>
  pullOf(upstream, number, { head: headFrom(owner, 'feature-12') });

it(
  "attaches the pull requests of the Session's branch and shows them without a reload",
  async () => {
    const run = await journey();

    expect(await discover(run)).toEqual({
      result: 'found',
      pullRequests: [ownReference],
    });
    expect(await changesOf(run)).toMatchObject([{ id: own, stage: 'open' }]);
  },
  slow,
);

it(
  'discovers the same pull request once however often it runs, and never writes to GitHub',
  async () => {
    const run = await journey();

    await discover(run);
    await discover(run);
    await attach(run, 'owner/repository#12');

    expect(await changesOf(run)).toMatchObject([{ id: own }]);
    expect(
      run.github.requests
        .filter(({ host }) => host === 'api.github.com')
        .map(({ method }) => method),
    ).not.toContain('POST');
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
      head: headFrom('owner', 'feature-20'),
    });

    run.github.pulls.set(...merged);
    await discover(run);
    switchBranch(run, 'feature-20');
    await discover(run);
    switchBranch(run, 'no-pull-request-here');

    expect(await discover(run)).toMatchObject({ result: 'no-match' });
    expect(await changesOf(run)).toMatchObject([
      { id: own, stage: 'open' },
      { id: 'github:owner/repository#20', stage: 'merged' },
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
    run.github.pulls.set(...proposedUpstream(12, 'other'));

    expect(await discover(run)).toEqual({
      result: 'found',
      pullRequests: [ownReference, { repository: upstream, number: 7 }],
    });
    expect(await changesOf(run)).toMatchObject([
      { id: own },
      { id: 'github:upstream/repository#7' },
    ]);
  },
  slow,
);
