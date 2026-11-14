import { expect, it } from 'vitest';
import {
  attach,
  changesOf,
  discover,
  listed,
  switchBranch,
} from './journey-calls-fixture';
import {
  foreignSessionId,
  gitlabProject,
  gitlabSessionId,
  journey,
  otherProject,
  project,
  secondSessionId,
  signedOutJourney,
} from './journey-fixture';

const slow = 30_000;

const own = 'github:owner/repository#12';

const ownReference = 'owner/repository#12';

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

it.each([
  ['has no origin', otherProject.id, foreignSessionId],
  ['lives on GitLab', gitlabProject.id, gitlabSessionId],
])(
  'answers not-github for a Project that %s, without asking GitHub',
  async (_name, projectId, sessionId) => {
    const run = await journey();

    expect(await discover(run, { sessionId, projectId })).toEqual({
      result: 'not-github',
    });
    expect(run.github.listReads()).toEqual([]);
  },
  slow,
);

it(
  'answers no-match, naming the branch, and keeps what was attached',
  async () => {
    const run = await journey();

    await attach(run, ownReference);
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
  'answers unavailable once the Project has no GitHub Account, and keeps the links',
  async () => {
    const run = await journey();

    await discover(run);

    for (const { id } of run.test.accounts.list())
      await run.test.accounts.signOut(id);

    expect(await discover(run)).toMatchObject({
      result: 'unavailable',
      signIn: true,
    });
    expect(await listed(run)).toMatchObject({
      changes: [{ repository: 'owner/repository', number: 12 }],
    });
  },
  slow,
);

it.each([
  ['refuses the sign-in', 401, true],
  ['fails', 500, false],
])(
  'answers unavailable when GitHub %s, without dropping a link or closing a pull request',
  async (_name, status, signIn) => {
    const run = await journey();

    await discover(run);
    run.github.failWith.status = status;

    expect(await discover(run)).toMatchObject({
      result: 'unavailable',
      signIn,
    });

    run.github.failWith.status = null;

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

    run.sessions[secondSessionId] = {
      projectId: project.id,
      title: 'Other',
      branch: 'feature-12',
    };

    await expect(discover(run, foreign)).rejects.toBeInstanceOf(Error);
    expect(run.github.listReads()).toEqual([]);

    await discover(run);

    expect(await changesOf(run, second)).toEqual([]);
    expect(await discover(run, second)).toMatchObject({ result: 'found' });
    expect(await changesOf(run, second)).toMatchObject([{ id: own }]);
  },
  slow,
);
