import { expect, it } from 'vitest';
import {
  fixCommentPrompt,
  reviewComments,
  texts,
  watch,
} from './auto-fix-fixture';
import {
  attached,
  automationOf,
  refresh,
  tap as tapAutomation,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
import { changePull } from './journey-watch-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const remark = { path: 'src/app.ts', line: 14, body: 'Rename this.' };

it(
  "quotes a review comment as the reviewer's words, and says when to ask rather than push",
  async () => {
    const run = await attached();

    await tap(run, true);
    reviewComments(run, { id: 1, ...remark });
    await watch(run);

    expect(texts(run)).toEqual([
      fixCommentPrompt(sha, [
        'Review comment on `src/app.ts` line 14:\n\n  > Rename this.',
      ]),
    ]);
  },
  slow,
);

it(
  'prompts only comments from the repository owner, members, collaborators and GitHub Apps',
  async () => {
    const run = await attached();

    await tap(run, true);
    reviewComments(
      run,
      {
        id: 1,
        ...remark,
        body: 'Mine.',
        user: { login: 'octocat', type: 'User' },
        author_association: 'OWNER',
      },
      {
        id: 2,
        ...remark,
        body: 'Outsider.',
        author_association: 'CONTRIBUTOR',
      },
      { id: 3, ...remark, body: 'Stranger.', author_association: 'NONE' },
      {
        id: 4,
        ...remark,
        body: 'Collaborator.',
        author_association: 'COLLABORATOR',
      },
      {
        id: 5,
        ...remark,
        body: 'App.',
        user: { login: 'linter[bot]', type: 'Bot' },
        author_association: 'NONE',
      },
    );
    await watch(run);

    expect(
      [
        ...texts(run)
          .join('\n')
          .matchAll(/> (.*)/g),
      ].map(([, quote]) => quote),
    ).toEqual(['Mine.', 'Collaborator.', 'App.']);
  },
  slow,
);

it(
  'is unavailable, with why, on a pull request someone else opened',
  async () => {
    const run = await attached();

    changePull(run, 12, { user: { login: 'someone-else' } });
    await refresh(run);

    expect((await automationOf(run)).fix).toEqual({
      on: false,
      available: false,
      reason: 'Only pull requests you opened',
    });
    await expect(tap(run, true)).rejects.toThrow(
      'Only pull requests you opened can use Auto-fix.',
    );
  },
  slow,
);
