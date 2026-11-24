import { expect, it } from 'vitest';
import { failChecks, lintPrompt, watch } from './auto-fix-fixture';
import { attached, set, slow } from './auto-merge-fixture';
import { pullOf, sha } from './github-fixture';
import { attach } from './journey-calls-fixture';
import {
  otherProject,
  project,
  secondSessionId,
  sessionId,
  type Journey,
} from './journey-fixture';
import { promptsSent, promptsWithdrawn } from './journey-prompts-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';

const second = { sessionId: secondSessionId, projectId: project.id };

const secondReference = 'owner/repository#13';

// Two Sessions with Auto-fix on, each with its own pull request.
async function twoFixing(): Promise<Journey> {
  const run = await attached();

  run.github.pulls.set(...pullOf('owner/repository', 13));
  await attach(run, '#13', second);
  await set(run, { kind: 'fix', on: true });
  await set(run, { kind: 'fix', on: true, reference: secondReference }, second);

  return run;
}

it(
  'reads the pull requests of different Sessions at the same time, so the Watch does not wait on each in turn',
  async () => {
    const run = await twoFixing();
    const reads = (): number => run.github.pullReads().length;
    const before = reads();
    const hold = Promise.withResolvers<void>();

    run.github.stall.until = hold.promise;

    // Each read waits on GitHub; one that waits for the one before it would never ask for the second.
    await run.test.clock.advance(60_000);
    await expect
      .poll(reads, { timeout: 5000 })
      .toBeGreaterThanOrEqual(before + 2);

    run.github.stall.until = null;
    hold.resolve();
    await run.test.settled();
    expect(await run.test.log()).toContain('watch completed');
  },
  slow,
);

const moved = {
  projectId: otherProject.id,
  title: 'Moved',
  branch: null,
};

it(
  'leaves a Session in another Project alone, and takes its Prompt back once it is back',
  async () => {
    const run = await attached();
    const home = { ...run.sessions[sessionId] };

    await set(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    await watch(run);

    run.sessions[sessionId] = moved;
    changePull(run, 12, { head: pushed(12) });
    await watch(run);
    expect(promptsWithdrawn(run)).toEqual([]);

    run.sessions[sessionId] = home;
    await watch(run);
    expect(promptsWithdrawn(run).map(({ text }) => text)).toEqual([lintPrompt]);
  },
  slow,
);

it(
  'forgets the pull request of a Session that no longer exists',
  async () => {
    const run = await attached();
    const home = { ...run.sessions[sessionId] };

    await set(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    await watch(run);

    Reflect.deleteProperty(run.sessions, sessionId);
    await watch(run);

    // Were the record kept, the Session coming back would find its Prompt withdrawn and the new head prompted.
    run.sessions[sessionId] = home;
    changePull(run, 12, { head: pushed(12) });
    failChecks(run, newHead, 'test');
    await watch(run);

    expect(promptsWithdrawn(run)).toEqual([]);
    expect(promptsSent(run)).toHaveLength(1);
  },
  slow,
);
