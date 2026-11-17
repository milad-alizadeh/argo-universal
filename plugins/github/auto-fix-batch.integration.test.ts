import { expect, it } from 'vitest';
import {
  checksRunning,
  failChecks,
  failedItem,
  fixPrompt,
  texts,
  watch,
} from './auto-fix-fixture';
import { attached, tap as tapAutomation } from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
import { promptsSent } from './journey-prompts-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

const quality = 'Quality';

const storyTests = 'Story tests';

it(
  'lists every failed Check of a head in one Prompt',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, quality, 'Story render gates');
    await watch(run);

    expect(texts(run)).toEqual([
      fixPrompt(sha, [failedItem(quality), failedItem('Story render gates')]),
    ]);
  },
  slow,
);

it(
  'waits for a head’s running Checks before it prompts, so the Prompt lists them all',
  async () => {
    const run = await attached();

    await tap(run, true);
    checksRunning(run, sha, { failed: [quality], running: [storyTests] });
    await watch(run);
    expect(promptsSent(run)).toEqual([]);

    failChecks(run, sha, quality, storyTests);
    await watch(run);

    expect(texts(run)).toEqual([
      fixPrompt(sha, [failedItem(quality), failedItem(storyTests)]),
    ]);
  },
  slow,
);
