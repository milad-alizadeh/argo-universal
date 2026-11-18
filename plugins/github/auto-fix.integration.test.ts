import { expect, it } from 'vitest';
import {
  failChecks,
  failedItem,
  fixPrompt,
  lintPrompt,
  texts,
  watch,
} from './auto-fix-fixture';
import {
  attached,
  automationOf,
  repository,
  tap as tapAutomation,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import { restart, sessionId, type Journey } from './journey-fixture';
import { promptsSent } from './journey-prompts-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';
import type { AutomationState } from './pull-automation';

const slow = 120_000;

const oldFailure = expect.stringContaining('Check `old` failed');

// How long a Change may take to show what GitHub now says, which a Slot reads behind its answer.
const wait = 20_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const fixOffer = async (run: Journey): Promise<AutomationState> =>
  (await automationOf(run)).fix;

it(
  'is off by default and prompts nothing for a failed Check',
  async () => {
    const run = await attached();

    failChecks(run, sha, 'lint');
    await watch(run);

    expect(promptsSent(run)).toEqual([]);
    expect(await fixOffer(run)).toEqual({ on: false, available: true });
  },
  slow,
);

it(
  'prompts existing failed Checks when enabled and never sends the same failure twice',
  async () => {
    const run = await attached();

    failChecks(run, sha, 'old');
    await tap(run, true);
    expect(await fixOffer(run)).toEqual({ on: true, available: true });
    expect(texts(run)).toEqual([oldFailure]);

    await watch(run);
    expect(texts(run)).toEqual([oldFailure]);

    failChecks(run, sha, 'old', 'lint');
    await watch(run);
    await watch(run);

    expect(promptsSent(run)).toEqual([
      expect.objectContaining({
        text: oldFailure,
      }),
      {
        sessionId,
        text: lintPrompt,
        sender: { pluginId: 'github', title: expect.any(String) },
      },
    ]);
  },
  slow,
);

it(
  'treats the failures of a new push as new, and keeps its choice across a restart',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);
    await restart(run);

    changePull(run, 12, { head: pushed(12) });
    failChecks(run, newHead, 'lint');
    await watch(run);

    expect(texts(run)).toEqual([
      lintPrompt,
      fixPrompt(newHead, [failedItem('lint')]),
    ]);
    expect((await fixOffer(run)).on).toBe(true);
  },
  slow,
);

it(
  'stops after three Prompts on a head and retries existing problems when re-enabled',
  async () => {
    const run = await attached();

    await tap(run, true);

    for (const checks of [['a'], ['a', 'b'], ['a', 'b', 'c']]) {
      failChecks(run, sha, ...checks);
      await watch(run);
    }

    expect(texts(run)).toEqual([
      fixPrompt(sha, [failedItem('a')]),
      fixPrompt(sha, [failedItem('b')]),
      fixPrompt(sha, [failedItem('c')]),
    ]);
    expect(await fixOffer(run)).toEqual({
      on: false,
      available: true,
      reason: `Stopped after 3 tries on \`${sha.slice(0, 7)}\``,
    });

    failChecks(run, sha, 'a', 'b', 'c', 'd');
    await watch(run);
    expect(promptsSent(run)).toHaveLength(3);

    await tap(run, true);
    expect(texts(run).at(-1)).toBe(
      fixPrompt(sha, ['a', 'b', 'c', 'd'].map(failedItem)),
    );
    await expect
      .poll(() => fixOffer(run), { timeout: wait })
      .toEqual({ on: true, available: true });
  },
  slow,
);

it(
  'never turns off or prompts on a failed read',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    run.github.checksFailWith.set(`${repository}@${sha}`, 500);
    await watch(run);

    expect(promptsSent(run)).toEqual([]);
    expect((await fixOffer(run)).on).toBe(true);

    run.github.checksFailWith.clear();
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);
