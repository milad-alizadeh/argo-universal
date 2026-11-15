import { expect, it } from 'vitest';
import {
  failChecks,
  lintPrompt,
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
import { changePull, pushed } from './journey-watch-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const old = { id: 1, path: 'src/old.ts', line: 3, body: 'Old remark.' };

const conflictPrompt = `${reference} conflicts with main. Rebase or merge, resolve, and push.`;

// GitHub says the pull request conflicts with its base; a push moves it to `newHead` first.
const conflicted = (run: Journey, push = false): void => {
  const changes: Parameters<typeof changePull>[2] = {
    mergeable_state: 'dirty',
  };

  if (push) changes.head = pushed(12);

  changePull(run, 12, changes);
};

const renamePrompt = expect.stringContaining('`src/app.ts` line 14');

const rename = {
  id: 2,
  path: 'src/app.ts',
  line: 14,
  body: 'Rename this.\nIt reads badly.',
};

it(
  'sends one Prompt per new review comment, quoting it with its file and line, and leaves comments from before it was turned on',
  async () => {
    const run = await attached();

    reviewComments(run, old);
    await tap(run, true);
    await watch(run);
    expect(texts(run)).toEqual([]);

    reviewComments(run, old, rename);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([
      `Review comment on ${reference}, \`src/app.ts\` line 14:\n\n> Rename this.\n> It reads badly.\n\nAddress it and push.`,
    ]);
  },
  slow,
);

it(
  'sends one Prompt per conflicted head commit, and leaves a conflict from before it was turned on',
  async () => {
    const run = await attached();

    conflicted(run);
    await tap(run, true);
    await watch(run);
    expect(texts(run)).toEqual([]);

    conflicted(run, true);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([conflictPrompt]);
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
      `Review comment on ${reference}, \`README.md\`:\n\n> Say why.\n\nAddress it and push.`,
    ]);
  },
  slow,
);

it(
  'counts comments and conflicts with failed Checks towards the three tries on a head commit',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    conflicted(run);
    reviewComments(run, rename, { ...old, id: 4 });
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt, conflictPrompt, renamePrompt]);
    expect((await automationOf(run)).fix).toEqual({
      on: false,
      available: true,
      reason: `Stopped after 3 tries on \`${sha.slice(0, 7)}\``,
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
    expect(texts(run)).toEqual([lintPrompt, renamePrompt]);
  },
  slow,
);
