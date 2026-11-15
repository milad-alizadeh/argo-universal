import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { openRepository } from './github-fixture-automation';
import { attach, changesOf, listed } from './journey-calls-fixture';
import {
  caller,
  journey,
  project,
  restart,
  sessionId,
  type Caller,
  type Journey,
} from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const reference = `${repository}#12`;

type Automation = Record<string, { on: boolean; available: boolean; reason?: string }>;

// The automation the Changes Slot offers for the Session's one pull request.
async function automationOf(run: Journey): Promise<Automation | undefined> {
  const [change] = await changesOf(run);

  return (change as { automation?: Automation } | undefined)?.automation;
}

const set = (
  run: Journey,
  params: { reference?: string; kind: string; on: boolean },
  as: Caller = caller,
): ReturnType<Journey['test']['operations']['run']> =>
  run.test.operations.run({
    name: 'automationSet',
    params: { reference, ...params },
    caller: as,
    // An Agent's call asks the person first; this one says yes.
    confirm: () => Promise.resolve(),
  });

// A person's tap in the App: a person in the Project, naming the Session.
const tap = (
  run: Journey,
  params: { kind: string; on: boolean },
): ReturnType<Journey['test']['operations']['run']> =>
  run.test.operations.run({
    name: 'automationSet',
    params: { reference, sessionId, ...params },
    caller: { projectId: project.id, person: true },
  });

const refresh = (run: Journey): Promise<unknown> =>
  run.test.operations.run({ name: 'refresh', caller });

async function attached(): Promise<Journey> {
  const run = await journey();

  await attach(run, reference);

  return run;
}

const pullOf12 = (run: Journey) => {
  const pull = run.github.pulls.get(reference);

  if (!pull) throw new Error('The fixture has no pull request 12');

  return pull;
};

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
    expect((await automationOf(run))?.merge).toEqual({
      on: true,
      available: true,
    });

    await restart(run);

    expect((await automationOf(run))?.merge.on).toBe(true);
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
    expect((await automationOf(run))?.merge.on).toBe(false);
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

      run.github.repositories.set(repository, { ...openRepository, ...settings });
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

    expect((await automationOf(run))?.merge.on).toBe(true);
    expect(run.github.autoMergeCalls()).toEqual([]);

    pullOf12(run).auto_merge = null;
    await refresh(run);

    expect((await automationOf(run))?.merge.on).toBe(false);
  },
  slow,
);

it(
  'says why Auto-merge cannot be used: the repository forbids it, the pull request is a draft, or it is not Open',
  async () => {
    const forbidden = await attached();

    forbidden.github.repositories.set(repository, {
      ...openRepository,
      allow_auto_merge: false,
    });
    expect((await automationOf(forbidden))?.merge).toEqual({
      on: false,
      available: false,
      reason: 'Not allowed in this repository',
    });

    const draft = await attached();

    pullOf12(draft).draft = true;
    await refresh(draft);
    expect((await automationOf(draft))?.merge).toEqual({
      on: false,
      available: false,
      reason: "Draft pull requests can't auto-merge",
    });

    for (const state of [{ merged: true, state: 'closed' as const }, { state: 'closed' as const }]) {
      const finished = await attached();

      Object.assign(pullOf12(finished), state);
      await refresh(finished);

      expect((await automationOf(finished))?.merge).toMatchObject({
        on: false,
        available: false,
        reason: expect.any(String),
      });
    }
  },
  slow,
);

it(
  'refuses to turn Auto-merge on where it is unavailable, and sends nothing to GitHub',
  async () => {
    const run = await attached();

    pullOf12(run).draft = true;
    await refresh(run);

    await expect(tap(run, { kind: 'merge', on: true })).rejects.toThrow(
      "Draft pull requests can't auto-merge",
    );
    expect(run.github.autoMergeCalls()).toEqual([]);
  },
  slow,
);

it(
  'never shows Auto-merge as off when GitHub could not be read',
  async () => {
    const unread = await attached();

    unread.github.graphqlFailWith.status = 500;
    await refresh(unread);

    const merge = (await automationOf(unread))?.merge;

    expect(merge).toMatchObject({ available: false });
    expect(merge?.reason).toBeUndefined();

    const known = await attached();

    await tap(known, { kind: 'merge', on: true });
    expect((await automationOf(known))?.merge.on).toBe(true);
    known.github.graphqlFailWith.status = 500;
    await refresh(known);

    expect((await automationOf(known))?.merge.on).toBe(true);
  },
  slow,
);

it(
  'refuses a pull request that is not attached to the Session, and an automation this Plugin does not offer yet',
  async () => {
    const run = await journey();

    await expect(
      set(run, { kind: 'merge', on: true }),
    ).rejects.toThrow('is not attached to this Session');

    await attach(run, reference);

    for (const kind of ['fix', 'archive'])
      await expect(set(run, { kind, on: true })).rejects.toThrow();

    expect(run.github.autoMergeCalls()).toEqual([]);
  },
  slow,
);

it(
  'lists the automation for an Agent too',
  async () => {
    const run = await attached();

    expect(await listed(run)).toMatchObject({
      changes: [{ automation: { merge: { available: true } } }],
    });
  },
  slow,
);
