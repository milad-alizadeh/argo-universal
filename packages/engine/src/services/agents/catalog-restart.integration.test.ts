import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

it('hydrates exact upstream metadata after a disk database restart while offline', async (): Promise<void> => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const first = await startEngineTestHost({
    database: stored.database,
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  const history = (await first.caller.session.list({ archived: false }))
    .sessions;
  await first.caller.agents.syncCatalog();
  const accepted = await first.caller.agents.catalog();
  await first.stop();
  stored.database.$client.close();
  const database = openDatabase(join(stored.directory, 'argo.db'));
  onTestFinished((): void => database.$client.close());
  const restarted = await startEngineTestHost({
    database,
    fetchAgents: fetchOfflineAgents,
  });
  await restarted.caller.agents.syncCatalog();
  const catalog = await restarted.caller.agents.catalog();
  expect(catalog).toMatchObject({
    status: 'stale',
    error: 'Registry is offline',
    rejectedValues: 0,
    fetchedAt: accepted.fetchedAt,
    agents: accepted.agents,
  });
  expect(
    database
      .select()
      .from(agents)
      .all()
      .map((row) => JSON.parse(row.registryMetadata ?? 'null')),
  ).toEqual(publishedRegistry.agents);
  expect(
    (await restarted.caller.session.list({ archived: false })).sessions,
  ).toEqual(history);
});

const fetchOfflineAgents = async (): Promise<never> => {
  throw new Error('Registry is offline');
};
