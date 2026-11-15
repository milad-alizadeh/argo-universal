import { expect, it } from 'vitest';
import {
  attached,
  automationOf,
  mergeOf,
  pullOf12,
  refresh,
  repository,
  slow,
  tap,
} from './auto-merge-fixture';
import { openRepository } from './github-fixture-automation';
import { restart } from './journey-fixture';

it(
  'offers Auto-merge, off, on an open pull request, and Auto-fix, and offers no Auto-archive yet',
  async () => {
    const run = await attached();

    expect(await automationOf(run)).toEqual({
      fix: { on: false, available: true },
      merge: { on: false, available: true },
      archive: { on: false, available: false },
    });
  },
  slow,
);

it(
  'turns on GitHub auto-merge with squash when a person ticks it, and shows it ticked after a restart',
  async () => {
    const run = await attached();

    await tap(run, { kind: 'merge', on: true });

    expect(run.github.autoMergeCalls()).toEqual([
      {
        kind: 'enable',
        pullRequestId: 'PR_owner/repository#12',
        mergeMethod: 'SQUASH',
      },
    ]);
    expect(await mergeOf(run)).toEqual({ on: true, available: true });

    await restart(run);

    expect((await mergeOf(run)).on).toBe(true);
  },
  slow,
);

it(
  'turns GitHub auto-merge off when it is unticked',
  async () => {
    const run = await attached();

    await tap(run, { kind: 'merge', on: true });
    await tap(run, { kind: 'merge', on: false });

    expect(run.github.autoMergeCalls().map(({ kind }) => kind)).toEqual([
      'enable',
      'disable',
    ]);
    expect((await mergeOf(run)).on).toBe(false);
  },
  slow,
);

it(
  'uses the first method the repository allows, in the order squash, merge, rebase',
  async () => {
    const methods = [
      [{ allow_squash_merge: false }, 'MERGE'],
      [{ allow_squash_merge: false, allow_merge_commit: false }, 'REBASE'],
    ] as const;

    for (const [settings, method] of methods) {
      const run = await attached();

      run.github.repositories.set(repository, {
        ...openRepository,
        ...settings,
      });
      await tap(run, { kind: 'merge', on: true });

      expect(run.github.autoMergeCalls()[0]?.mergeMethod).toBe(method);
    }
  },
  slow,
);

it(
  'shows auto-merge ticked when it was turned on in GitHub itself, and unticked when it was turned off there',
  async () => {
    const run = await attached();

    pullOf12(run).auto_merge = { merge_method: 'merge' };
    await refresh(run);

    expect((await mergeOf(run)).on).toBe(true);
    expect(run.github.autoMergeCalls()).toEqual([]);

    pullOf12(run).auto_merge = null;
    await refresh(run);

    expect((await mergeOf(run)).on).toBe(false);
  },
  slow,
);
