import { expect, it } from 'vitest';
import { attached, automationOf, set, slow, tap } from './auto-merge-fixture';
import { changePull } from './journey-watch-fixture';

const firstEnable = { kind: 'fix', on: true, firstEnable: true };

it(
  'preserves a manual opt-out when the PR handoff repeats',
  async () => {
    const run = await attached();

    await Promise.all([set(run, firstEnable), set(run, firstEnable)]);
    expect((await automationOf(run)).fix.on).toBe(true);

    await tap(run, { kind: 'fix', on: false });
    await expect(set(run, firstEnable)).resolves.toMatchObject({ on: false });
    expect((await automationOf(run)).fix.on).toBe(false);
  },
  slow,
);

it(
  'refuses automatic enable on a pull request opened by someone else',
  async () => {
    const run = await attached();
    changePull(run, 12, { user: { login: 'someone-else' } });

    await expect(set(run, firstEnable)).rejects.toThrow(
      'Only pull requests you opened can use Auto-fix.',
    );
  },
  slow,
);
