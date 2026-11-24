import { expect, it } from 'vitest';
import { failChecks, watch } from './auto-fix-fixture';
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
import { promptsSent } from './journey-prompts-fixture';
import { changePull, pushed } from './journey-watch-fixture';

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
  'reads every Auto-fix pull request of the Project at once, so a Project with many of them completes within the budget',
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

it(
  'leaves a Session that has left the Project alone: no withdraw, no refusal',
  async () => {
    const run = await attached();

    await set(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    await watch(run);
    expect(promptsSent(run)).toHaveLength(1);

    run.sessions[sessionId] = {
      projectId: otherProject.id,
      title: 'Moved',
      branch: null,
    };
    changePull(run, 12, { head: pushed(12) });
    await watch(run);

    const log = await run.test.log();

    expect(log).not.toContain('refused');
    expect(log).not.toContain('watch failed');
  },
  slow,
);
