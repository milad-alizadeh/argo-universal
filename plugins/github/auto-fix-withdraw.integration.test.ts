import { expect, it } from 'vitest';
import {
  failChecks,
  failedItem,
  fixCommentPrompt,
  fixPrompt,
  lintPrompt,
  reviewComments,
  texts,
  watch,
} from './auto-fix-fixture';
import { attached, tap as tapAutomation } from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
import { promptsWithdrawn, startPrompts } from './journey-prompts-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const renameItem =
  'Review comment on `src/app.ts` line 14:\n\n  > Rename this.\n  > It reads badly.';

const rename = {
  id: 2,
  path: 'src/app.ts',
  line: 14,
  body: 'Rename this.\nIt reads badly.',
};

it(
  'withdraws its queued Prompt when a push moves the head, and prompts the new head’s failures',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);

    changePull(run, 12, { head: pushed(12) });
    failChecks(run, newHead, 'test');
    await watch(run);

    expect(promptsWithdrawn(run).map(({ text }) => text)).toEqual([lintPrompt]);
    expect(texts(run)).toEqual([
      lintPrompt,
      fixPrompt(newHead, [failedItem('test')]),
    ]);
  },
  slow,
);

it(
  'leaves a Prompt that already started when the head moves',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);
    startPrompts(run);

    changePull(run, 12, { head: pushed(12) });
    await watch(run);
    await watch(run);

    expect(promptsWithdrawn(run)).toEqual([]);
    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);

it(
  'withdraws its queued Prompt when the pull request merges',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);

    changePull(run, 12, { state: 'closed', merged: true });
    await watch(run);

    expect(promptsWithdrawn(run).map(({ text }) => text)).toEqual([lintPrompt]);
  },
  slow,
);

it(
  'prompts a review comment again on the new head when its Prompt was withdrawn before it started',
  async () => {
    const run = await attached();

    await tap(run, true);
    reviewComments(run, rename);
    await watch(run);

    changePull(run, 12, { head: pushed(12) });
    await watch(run);

    expect(promptsWithdrawn(run)).toHaveLength(1);
    expect(texts(run)).toEqual([
      fixCommentPrompt(sha, [renameItem]),
      fixCommentPrompt(newHead, [renameItem]),
    ]);
  },
  slow,
);
