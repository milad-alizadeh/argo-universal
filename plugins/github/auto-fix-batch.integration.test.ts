import { expect, it } from 'vitest';
import {
  checksRunning,
  conflictItem,
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
import { changePull } from './journey-watch-fixture';

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
  'prompts a failed Check without waiting for the head’s running Checks, then the ones that fail later',
  async () => {
    const run = await attached();

    await tap(run, true);
    checksRunning(run, sha, { failed: [quality], running: [storyTests] });
    await watch(run);
    expect(texts(run)).toEqual([fixPrompt(sha, [failedItem(quality)])]);

    failChecks(run, sha, quality, storyTests);
    await watch(run);

    expect(texts(run)).toEqual([
      fixPrompt(sha, [failedItem(quality)]),
      fixPrompt(sha, [failedItem(storyTests)]),
    ]);
  },
  slow,
);

it(
  'prompts a conflict and a failed Check together while other Checks still run',
  async () => {
    const run = await attached();

    checksRunning(run, sha, { failed: [quality], running: [storyTests] });
    changePull(run, 12, { mergeable_state: 'dirty' });
    await tap(run, true);

    expect(texts(run)).toEqual([
      fixPrompt(sha, [failedItem(quality), conflictItem]),
    ]);
  },
  slow,
);
