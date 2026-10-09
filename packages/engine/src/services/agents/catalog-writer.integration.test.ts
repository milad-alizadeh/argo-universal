import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startRouterTestHost } from '#mocks/router';

it('rejects catalog admission while Session writes retry and cannot commit it later', async (): Promise<void> => {
  const { caller, context, databaseWriter } = startRouterTestHost({
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  context.database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END",
  );
  databaseWriter.send({
    type: 'writer.write',
    job: {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Retried Session' },
    },
  });
  await waitFor(databaseWriter, (snapshot) => snapshot.matches('waitingToRetry'));
  await expect(caller.agents.syncCatalog()).rejects.toThrow('Writer cannot commit');
  expect((await caller.agents.catalog()).agents).toEqual([]);
  context.database.$client.exec('DROP TRIGGER reject_session');
  databaseWriter.send({ type: 'writer.drain' });
  await waitFor(databaseWriter, (snapshot) => snapshot.status === 'done');
  expect((await caller.agents.catalog()).agents).toEqual([]);
  expect((await caller.session.list({ archived: false })).sessions).toMatchObject([
    { title: 'Retried Session' },
  ]);
});
