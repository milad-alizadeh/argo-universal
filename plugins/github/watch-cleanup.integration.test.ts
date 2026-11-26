import { expect, it } from 'vitest';
import { failChecks, lintPrompt, texts, watch } from './auto-fix-fixture';
import { attached, automationOf, set, slow } from './auto-merge-fixture';
import { sha } from './github-fixture';
import { sessionId, type Journey } from './journey-fixture';
import {
  allowPrompts,
  promptsRefused,
  promptsSent,
  refusePrompts,
} from './journey-prompts-fixture';

const archive = (run: Journey, archived: boolean): void => {
  run.sessions[sessionId] = { ...run.sessions[sessionId], archived };
};

const minuteMs = 60_000;

// Everything Argo asked GitHub so far.
const asked = (run: Journey): number => run.github.requests.length;

// An archived Session stays readable but takes no Prompts, so its automations can only fail: they are turned off.
it(
  'turns Auto-fix and Auto-archive off for the pull request of an archived Session and asks GitHub nothing for it',
  async () => {
    const run = await attached();

    await set(run, { kind: 'fix', on: true });
    await set(run, { kind: 'archive', on: true });
    failChecks(run, sha, 'lint');
    archive(run, true);

    const before = asked(run);

    await watch(run);
    await watch(run);

    expect(asked(run)).toBe(before);
    expect(promptsSent(run)).toEqual([]);

    archive(run, false);
    await watch(run);

    expect(promptsSent(run)).toEqual([]);
    expect(await automationOf(run)).toMatchObject({
      fix: { on: false },
      archive: { on: false },
    });
  },
  slow,
);

// A Session that refused a Prompt will likely refuse the next, so Auto-fix rests, longer each time, before it tries again.
it(
  'sends a refused Prompt again only after a rest, not on every Watch, and sends it once the Session takes it',
  async () => {
    const run = await attached();

    await set(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    refusePrompts(run);

    await watch(run);
    expect(promptsRefused(run)).toHaveLength(1);

    for (const _ of [1, 2, 3]) await watch(run);
    expect(promptsRefused(run)).toHaveLength(1);

    await run.test.clock.advance(2 * minuteMs);
    await watch(run);
    expect(promptsRefused(run)).toHaveLength(2);

    allowPrompts(run);
    await run.test.clock.advance(10 * minuteMs);
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);
