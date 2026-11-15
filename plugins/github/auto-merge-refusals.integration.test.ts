import { expect, it } from 'vitest';
import {
  attached,
  mergeOf,
  pullOf12,
  reference,
  refresh,
  repository,
  set,
  slow,
  tap,
} from './auto-merge-fixture';
import { openRepository } from './github-fixture-automation';
import { attach, listed } from './journey-calls-fixture';
import { journey } from './journey-fixture';

it(
  'says Auto-merge cannot be used where the repository forbids it',
  async () => {
    const run = await attached();

    run.github.repositories.set(repository, {
      ...openRepository,
      allow_auto_merge: false,
    });

    expect(await mergeOf(run)).toEqual({
      on: false,
      available: false,
      reason: 'Not allowed in this repository',
    });
  },
  slow,
);

it(
  'says Auto-merge cannot be used on a draft pull request',
  async () => {
    const run = await attached();

    pullOf12(run).draft = true;
    await refresh(run);

    expect(await mergeOf(run)).toEqual({
      on: false,
      available: false,
      reason: "Draft pull requests can't auto-merge",
    });
  },
  slow,
);

it(
  'says Auto-merge cannot be used on a pull request that is not Open',
  async () => {
    for (const state of [
      { merged: true, state: 'closed' as const },
      { state: 'closed' as const },
    ]) {
      const run = await attached();

      Object.assign(pullOf12(run), state);
      await refresh(run);

      expect(await mergeOf(run)).toMatchObject({
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
    const run = await attached();

    run.github.graphqlFailWith.status = 500;
    await refresh(run);

    const merge = await mergeOf(run);

    expect(merge).toMatchObject({ available: false });
    expect(merge.reason).toBeUndefined();
  },
  slow,
);

it(
  'keeps showing Auto-merge as it was last known when GitHub can no longer be read',
  async () => {
    const run = await attached();

    await tap(run, { kind: 'merge', on: true });
    expect((await mergeOf(run)).on).toBe(true);

    run.github.graphqlFailWith.status = 500;
    await refresh(run);

    expect((await mergeOf(run)).on).toBe(true);
  },
  slow,
);

it(
  'refuses a pull request that is not attached to the Session, and an automation this Plugin does not offer yet',
  async () => {
    const run = await journey();

    await expect(set(run, { kind: 'merge', on: true })).rejects.toThrow(
      'is not attached to this Session',
    );

    await attach(run, reference);

    for (const kind of ['fix', 'archive'])
      await expect(set(run, { kind, on: true })).rejects.toThrow(
        `Auto-${kind} is not available`,
      );

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
