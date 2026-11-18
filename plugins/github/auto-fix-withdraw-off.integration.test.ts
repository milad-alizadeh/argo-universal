import { expect, it } from 'vitest';
import {
  failChecks,
  failedItem,
  fixPrompt,
  lintPrompt,
  texts,
  watch,
} from './auto-fix-fixture';
import { attached, tap as tapAutomation } from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
import {
  allowWithdraw,
  promptsWithdrawn,
  refuseWithdraw,
} from './journey-prompts-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const withdrawnTexts = (run: Journey): string[] =>
  promptsWithdrawn(run).map(({ text }) => text);

it(
  'withdraws its queued Prompt when Auto-fix is turned off',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);
    await tap(run, false);

    expect(withdrawnTexts(run)).toEqual([lintPrompt]);
  },
  slow,
);

it(
  'still prompts the new head when a withdraw fails, and withdraws on the next Watch',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);
    refuseWithdraw(run);

    changePull(run, 12, { head: pushed(12) });
    failChecks(run, newHead, 'test');
    await watch(run);

    expect(withdrawnTexts(run)).toEqual([]);
    expect(texts(run)).toEqual([
      lintPrompt,
      fixPrompt(newHead, [failedItem('test')]),
    ]);

    allowWithdraw(run);
    await watch(run);
    expect(withdrawnTexts(run)).toEqual([lintPrompt]);
  },
  slow,
);
