import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, changesOf, detach, idsOf, listed } from './journey-calls';
import { journey, project, secondSessionId } from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const fork = 'fork-owner/repository';

const owned = `${repository}#12`;

const forked = `${fork}#12`;

const ownedId = `github:${owned}`;

const forkedId = `github:${forked}`;

it(
  'keeps several pull requests on one Session, in the order they were attached',
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 3, { title: 'Third' }));
    run.github.pulls.set(...pullOf(repository, 1, { title: 'First' }));

    await attach(run, '#3');
    await attach(run, '#1');
    await attach(run, forked);

    expect(await idsOf(run)).toEqual([
      'github:owner/repository#3',
      'github:owner/repository#1',
      forkedId,
    ]);
  },
  slow,
);

it(
  'detaches only the pull request it names, and detaching it again changes nothing',
  async () => {
    const run = await journey();

    await attach(run, owned);
    await attach(run, forked);

    expect(await detach(run, owned)).toMatchObject({ detached: true });
    await detach(run, owned);

    expect(await idsOf(run)).toEqual([forkedId]);
    expect(await listed(run)).toMatchObject({ changes: [{ id: forkedId }] });
  },
  slow,
);

it(
  'detaches by URL or by number as it attached, whatever the case of the repository',
  async () => {
    const run = await journey();

    await attach(run, owned);
    await detach(run, 'https://github.com/Owner/Repository/pull/12');

    expect(await idsOf(run)).toEqual([]);

    await attach(run, '12');
    await detach(run, '#12');

    expect(await idsOf(run)).toEqual([]);
  },
  slow,
);

it(
  "leaves another Session's association with the same pull request",
  async () => {
    const run = await journey();
    const other = { sessionId: secondSessionId, projectId: project.id };

    await attach(run, owned);
    await attach(run, owned, other);
    await detach(run, owned);

    expect(await idsOf(run, other)).toEqual([ownedId]);
    expect(await idsOf(run)).toEqual([]);
  },
  slow,
);

it(
  'refuses to detach a reference it cannot read, rather than guessing',
  async () => {
    const run = await journey();

    await expect(detach(run, 'not a pull request')).rejects.toThrow(
      'is not a pull request',
    );
  },
  slow,
);

it(
  'can detach a pull request GitHub no longer shows, so a broken association never sticks',
  async () => {
    const run = await journey();

    await attach(run, owned);
    run.github.pulls.delete(owned);
    await detach(run, owned);

    expect(await listed(run)).toEqual({ changes: [] });
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);
