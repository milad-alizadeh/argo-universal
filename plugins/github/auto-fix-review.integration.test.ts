import { expect, it } from 'vitest';
import {
  conflictItem,
  failChecks,
  failedItem,
  fixCommentPrompt,
  fixPrompt,
  reviewComments,
  texts,
  watch,
} from './auto-fix-fixture';
import {
  attached,
  automationOf,
  reference,
  tap as tapAutomation,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
import { startPrompts } from './journey-prompts-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const old = { id: 1, path: 'src/old.ts', line: 3, body: 'Old remark.' };

const conflictPrompt = fixPrompt(sha, [conflictItem]);

// GitHub says the pull request conflicts with its base; a push moves it to `newHead` first.
const conflicted = (run: Journey, push = false): void => {
  const changes: Parameters<typeof changePull>[2] = {
    mergeable_state: 'dirty',
  };

  if (push) changes.head = pushed(12);

  changePull(run, 12, changes);
};

const renameItem =
  'Review comment on `src/app.ts` line 14:\n\n  > Rename this.\n  > It reads badly.';

const renamePrompt = expect.stringContaining('`src/app.ts` line 14');

const rename = {
  id: 2,
  path: 'src/app.ts',
  line: 14,
  body: 'Rename this.\nIt reads badly.',
};

it(
  'prompts each new review comment once, quoting it with its file and line, including comments already present when enabled',
  async () => {
    const run = await attached();

    reviewComments(run, old);
    await tap(run, true);
    await watch(run);
    expect(texts(run)).toEqual([expect.stringContaining(old.body)]);

    reviewComments(run, old, rename);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([
      expect.stringContaining(old.body),
      fixCommentPrompt(sha, [renameItem]),
    ]);
  },
  slow,
);

it(
  'sends one Prompt per conflicted head commit, including a conflict already present when enabled',
  async () => {
    const run = await attached();

    conflicted(run);
    await tap(run, true);
    await watch(run);
    expect(texts(run)).toEqual([conflictPrompt]);

    conflicted(run, true);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([
      conflictPrompt,
      fixPrompt(newHead, [conflictItem]),
    ]);
  },
  slow,
);

it(
  'never prompts a review comment again after a push, and says a comment with no line by its file alone',
  async () => {
    const run = await attached();

    await tap(run, true);
    reviewComments(run, rename);
    await watch(run);
    startPrompts(run);

    changePull(run, 12, { head: pushed(12) });
    reviewComments(run, rename, {
      id: 3,
      path: 'README.md',
      line: null,
      body: 'Say why.',
    });
    await watch(run);

    expect(texts(run)).toEqual([
      renamePrompt,
      fixCommentPrompt(newHead, [
        'Review comment on `README.md`:\n\n  > Say why.',
      ]),
    ]);
  },
  slow,
);

it(
  'lists failed Checks, a conflict and review comments in one Prompt, counted as one try',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    conflicted(run);
    reviewComments(run, rename, { ...old, id: 4 });
    await watch(run);

    expect(texts(run)).toEqual([
      fixCommentPrompt(sha, [
        failedItem('lint'),
        conflictItem,
        renameItem,
        'Review comment on `src/old.ts` line 3:\n\n  > Old remark.',
      ]),
    ]);
    expect((await automationOf(run)).fix).toEqual({
      on: true,
      available: true,
    });
  },
  slow,
);

it(
  'sends nothing while the review comments cannot be read, and refuses to turn on without them',
  async () => {
    const run = await attached();

    run.github.commentsFailWith.set(reference, 500);
    await expect(tap(run, true)).rejects.toThrow('500');

    run.github.commentsFailWith.clear();
    await tap(run, true);
    run.github.commentsFailWith.set(reference, 500);
    failChecks(run, sha, 'lint');
    reviewComments(run, rename);
    await watch(run);

    expect(texts(run)).toEqual([]);
    expect((await automationOf(run)).fix.on).toBe(true);

    run.github.commentsFailWith.clear();
    await watch(run);
    expect(texts(run)).toEqual([
      fixCommentPrompt(sha, [failedItem('lint'), renameItem]),
    ]);
  },
  slow,
);
