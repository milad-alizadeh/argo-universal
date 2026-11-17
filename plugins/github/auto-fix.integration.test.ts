import { expect, it } from 'vitest';
import { failChecks, lintPrompt, texts, watch } from './auto-fix-fixture';
import {
  attached,
  automationOf,
  reference,
  repository,
  tap as tapAutomation,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import { attach, detach } from './journey-calls-fixture';
import { journey, restart, sessionId, type Journey } from './journey-fixture';
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
      `Check \`lint\` failed on ${reference} at ${newHead.slice(0, 7)}. Read it, fix it, and push.`,
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
    failChecks(run, sha, 'a', 'b', 'c');
    await watch(run);

    expect(promptsSent(run)).toHaveLength(3);
    expect(await fixOffer(run)).toEqual({
      on: false,
      available: true,
      reason: `Stopped after 3 tries on \`${sha.slice(0, 7)}\``,
    });

    failChecks(run, sha, 'a', 'b', 'c', 'd');
    await watch(run);
    expect(promptsSent(run)).toHaveLength(3);

    await tap(run, true);
    expect(promptsSent(run)).toHaveLength(6);
    await expect
      .poll(() => fixOffer(run), { timeout: wait })
      .toEqual({
        on: false,
        available: true,
        reason: `Stopped after 3 tries on \`${sha.slice(0, 7)}\``,
      });
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

it(
  'forgets Auto-fix when the pull request is detached',
  async () => {
    const run = await attached();

    await tap(run, true);
    await detach(run, reference);
    await attach(run, reference);

    expect(await fixOffer(run)).toEqual({ on: false, available: true });

    failChecks(run, sha, 'lint');
    await watch(run);
    expect(promptsSent(run)).toEqual([]);
  },
  slow,
);

it(
  'is refused for a pull request that is not attached',
  async () => {
    const run = await journey();

    await expect(tap(run, true)).rejects.toThrow('not attached');
  },
  slow,
);
