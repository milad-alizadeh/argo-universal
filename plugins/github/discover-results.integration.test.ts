import { expect, it } from 'vitest';
import {
  attach,
  changesOf,
  discover,
  listed,
  switchBranch,
} from './journey-calls';
import {
  foreignSessionId,
  journey,
  otherProject,
  project,
  secondSessionId,
  signedOutJourney,
} from './journey-fixture';

const slow = 30_000;

const own = 'github:owner/repository#12';

it(
  'answers branchless without asking GitHub',
  async () => {
    const run = await journey();

    switchBranch(run, null);

    expect(await discover(run)).toEqual({ result: 'branchless' });
    expect(run.github.listReads()).toEqual([]);
  },
  slow,
);

it(
  'answers not-github for a Project whose origin is not on GitHub',
  async () => {
    const run = await journey();

    const elsewhere = {
      sessionId: foreignSessionId,
      projectId: otherProject.id,
    };

    expect(await discover(run, elsewhere)).toEqual({ result: 'not-github' });
    expect(run.github.listReads()).toEqual([]);
  },
  slow,
);

it(
  'answers no-match, naming the branch, and keeps what was attached',
  async () => {
    const run = await journey();

    await attach(run, 'owner/repository#12');
    switchBranch(run, 'lonely');

    expect(await discover(run)).toEqual({
      result: 'no-match',
      branch: 'lonely',
      repositories: ['owner/repository'],
    });
    expect(await changesOf(run)).toMatchObject([{ id: own }]);
  },
  slow,
);

it(
  'answers unavailable, asking to sign in, while nobody is signed in',
  async () => {
    const run = await signedOutJourney();

    expect(await discover(run)).toMatchObject({
      result: 'unavailable',
      signIn: true,
    });
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  'answers unavailable when GitHub refuses, without dropping a link or closing a pull request',
  async () => {
    const run = await journey();

    await discover(run);
    run.github.accepted.clear();

    expect(await discover(run)).toMatchObject({ result: 'unavailable' });

    run.github.accepted.add('token-1');

    expect(await listed(run)).toMatchObject({
      changes: [{ id: own, stage: 'open' }],
    });
  },
  slow,
);

it(
  "keeps discovery inside the caller's Project and Session",
  async () => {
    const run = await journey();
    const foreign = { sessionId: foreignSessionId, projectId: project.id };
    const second = { sessionId: secondSessionId, projectId: project.id };

    await expect(discover(run, foreign)).rejects.toThrow('does not belong');

    await discover(run);

    expect(await changesOf(run, second)).toEqual([]);
    expect(await discover(run, second)).toEqual({ result: 'branchless' });
  },
  slow,
);
