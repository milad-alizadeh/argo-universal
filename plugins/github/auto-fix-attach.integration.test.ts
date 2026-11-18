import { expect, it } from 'vitest';
import { failChecks, watch } from './auto-fix-fixture';
import {
  attached,
  automationOf,
  reference,
  tap as tapAutomation,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import { attach, detach } from './journey-calls-fixture';
import { journey, type Journey } from './journey-fixture';
import { promptsSent } from './journey-prompts-fixture';

const slow = 120_000;

const tap = (run: Journey, on: boolean): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'fix', on });

it(
  'forgets Auto-fix when the pull request is detached',
  async () => {
    const run = await attached();

    await tap(run, true);
    await detach(run, reference);
    await attach(run, reference);

    expect((await automationOf(run)).fix).toEqual({
      on: false,
      available: true,
    });

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
