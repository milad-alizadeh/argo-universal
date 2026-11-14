import { expect, it } from 'vitest';
import {
  attach,
  changesOf,
  giveAccountTo,
  listed,
} from './journey-calls-fixture';
import {
  caller,
  foreignSessionId,
  journey,
  otherProject,
  project,
  secondSessionId,
} from './journey-fixture';

const slow = 30_000;

const second = { sessionId: secondSessionId, projectId: project.id };

const elsewhere = { sessionId: foreignSessionId, projectId: otherProject.id };

it(
  'keeps the same pull request attached in two Sessions, and in two Projects, as separate associations',
  async () => {
    const run = await journey();

    await giveAccountTo(run, otherProject.id);

    for (const as of [caller, second, elsewhere])
      await attach(run, 'owner/repository#12', as);

    for (const as of [caller, second, elsewhere])
      expect(await changesOf(run, as)).toHaveLength(1);

    expect(await listed(run, elsewhere)).toMatchObject({
      changes: [{ id: 'github:owner/repository#12' }],
    });
  },
  slow,
);
