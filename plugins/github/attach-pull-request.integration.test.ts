import { expect, it } from 'vitest';
import {
  attach,
  attributedChangesOf,
  changesOf,
  listed,
} from './journey-calls-fixture';
import {
  foreignSessionId,
  journey,
  otherProject,
  project,
  secondSessionId,
  signedOutJourney,
} from './journey-fixture';
import { openChange } from './open-change-fixture';

const slow = 30_000;

const pullReference = 'owner/repository#12';

const notAPullRequest = 'is not a pull request';

it(
  'shows an attached pull request as a Change with its GitHub number, title, stage and totals',
  async () => {
    const run = await journey();

    await attach(run, pullReference);

    expect(await changesOf(run)).toEqual([openChange]);
    expect(await attributedChangesOf(run)).toEqual([
      { pluginId: 'github', item: openChange },
    ]);
  },
  slow,
);

it(
  'answers no Changes for a Session that has attached nothing',
  async () => {
    const run = await journey();

    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  'attaches the same pull request once however often it is attached: by reference, URL or number',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    await attach(run, 'https://github.com/owner/repository/pull/12');
    await attach(run, '12');

    expect(await changesOf(run)).toEqual([openChange]);
    expect(await listed(run)).toEqual({ changes: [openChange] });
  },
  slow,
);

it(
  'keeps the same number in two repositories as two Changes',
  async () => {
    const run = await journey();

    await attach(run, pullReference);
    await attach(run, 'fork-owner/repository#12');

    expect(await changesOf(run)).toMatchObject([
      { id: 'github:owner/repository#12', title: 'Add the thing' },
      { id: 'github:fork-owner/repository#12', title: 'Same number elsewhere' },
    ]);
  },
  slow,
);

it.each([
  ['an unparseable reference', 'not a pull request', notAPullRequest],
  [
    'a pull request URL of another host',
    'https://example.com/o/r/pull/1',
    notAPullRequest,
  ],
  ['a pull request GitHub does not have', 'owner/repository#999', 'not found'],
])(
  'refuses %s and stores nothing',
  async (_name, reference, why) => {
    const run = await journey();

    await expect(attach(run, reference)).rejects.toThrow(why);
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  'refuses a pull request whose counts GitHub gives as something other than numbers, and stores nothing',
  async () => {
    const run = await journey();
    const pull = run.github.pulls.get(pullReference);

    if (!pull) throw new Error('The fixture holds no such pull request.');

    run.github.pulls.set(pullReference, { ...pull, additions: 'many' });

    await expect(attach(run, pullReference)).rejects.toThrow(
      'GitHub returned an invalid pull request.',
    );
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  "refuses a Session that is not in the caller's Project",
  async () => {
    const run = await journey();
    const foreign = { sessionId: foreignSessionId, projectId: project.id };

    await expect(attach(run, pullReference, foreign)).rejects.toThrow(
      'does not belong',
    );
    expect(
      await changesOf(run, {
        sessionId: foreignSessionId,
        projectId: otherProject.id,
      }),
    ).toEqual([]);
  },
  slow,
);

it(
  "keeps one Session's pull requests out of another Session's Changes",
  async () => {
    const run = await journey();

    await attach(run, pullReference);

    expect(
      await changesOf(run, {
        sessionId: secondSessionId,
        projectId: project.id,
      }),
    ).toEqual([]);
  },
  slow,
);

it(
  'refuses to attach while no GitHub Account is signed in',
  async () => {
    const run = await signedOutJourney();

    await expect(attach(run, pullReference)).rejects.toThrow(
      'Sign in to GitHub',
    );
    expect(await changesOf(run)).toEqual([]);
  },
  slow,
);

it(
  "reads GitHub as the person who signed in, with a token only Argo's broker holds",
  async () => {
    const run = await journey();

    await attach(run, pullReference);

    expect(
      run.github.pullReads().map(({ headers }) => headers.authorization),
    ).toContain('Bearer token-1');
    expect(await run.test.log()).not.toContain('token-1');
  },
  slow,
);
