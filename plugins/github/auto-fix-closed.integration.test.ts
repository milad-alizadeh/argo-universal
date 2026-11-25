import { expect, it } from 'vitest';
import { failChecks, lintPrompt, watch } from './auto-fix-fixture';
import { attached, tap } from './auto-merge-fixture';
import { sha } from './github-fixture';
import { otherProject, sessionId, type Journey } from './journey-fixture';
import {
  allowWithdraw,
  promptsWithdrawn,
  refuseWithdraw,
} from './journey-prompts-fixture';
import { changePull } from './journey-watch-fixture';

const slow = 120_000;

const withdrawnTexts = (run: Journey): string[] =>
  promptsWithdrawn(run).map(({ text }) => text);

const pullReads = (run: Journey): number => run.github.pullReads().length;

/*
 * A Closed pull request cannot change, so Auto-fix left on for it asks GitHub nothing more on each Watch: a Project
 * with many merged pull requests otherwise spends GitHub's rate limit re-reading them all. A Prompt it could not take
 * back is still taken back on a later Watch.
 */
it(
  'reads a Closed pull request with Auto-fix on no more on later Watches, and still withdraws its waiting Prompt',
  async () => {
    const run = await attached();

    await tap(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    await watch(run);

    refuseWithdraw(run);
    changePull(run, 12, { state: 'closed' });
    await watch(run);
    expect(withdrawnTexts(run)).toEqual([]);

    const reads = pullReads(run);

    allowWithdraw(run);
    await watch(run);
    await watch(run);

    expect(withdrawnTexts(run)).toEqual([lintPrompt]);
    expect(pullReads(run)).toBe(reads);
  },
  slow,
);

// The Server refuses a Prompt taken back from a Session of another Project, so a Closed pull request's shortcut waits for the Session to be home.
it(
  'leaves the Closed pull request of a Session in another Project alone, and takes its Prompt back once it is back',
  async () => {
    const run = await attached();
    const home = { ...run.sessions[sessionId] };

    await tap(run, { kind: 'fix', on: true });
    failChecks(run, sha, 'lint');
    await watch(run);

    changePull(run, 12, { state: 'closed' });
    run.sessions[sessionId] = {
      projectId: otherProject.id,
      title: 'Moved',
      branch: null,
    };
    await watch(run);
    expect(withdrawnTexts(run)).toEqual([]);

    run.sessions[sessionId] = home;
    await watch(run);
    expect(withdrawnTexts(run)).toEqual([lintPrompt]);
  },
  slow,
);
