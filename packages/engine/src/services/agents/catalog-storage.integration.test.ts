import { agentCatalogCache } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { rejectedRegistryValues } from '@repo/mocks/registry/published';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startRouterTestHost } from '#mocks/router';

it.each(rejectedRegistryValues.map((value, index) => [index, value] as const))(
  'counts corrupt SQLite metadata %i once during hydration',
  async (_, value): Promise<void> => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    stored.database
      .insert(agentCatalogCache)
      .values({
        id: 1,
        payload: JSON.stringify(value),
        fetchedAt: 1791504000000,
      })
      .run();
    const { caller } = startRouterTestHost({
      database: stored.database,
      registry: offlineRegistry,
    });
    expect(await caller.agents.catalog()).toMatchObject({
      status: 'unavailable',
      agents: [],
      fetchedAt: null,
      rejectedValues: 1,
      error: 'Registry is offline',
    });
  },
);

it('rejects a malformed SQLite fetched time through its canonical columns', async (): Promise<void> => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  stored.database.$client
    .prepare('insert into agent_catalog_cache values (1, ?, ?)')
    .run(JSON.stringify(publishedRegistry), 'unknown');
  const { caller } = startRouterTestHost({
    database: stored.database,
    registry: offlineRegistry,
  });
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    fetchedAt: null,
    rejectedValues: 1,
  });
});

it('keeps the last-good catalog and timestamp when the database rejects replacement', async (): Promise<void> => {
  const readRegistry = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce(publishedRegistry)
    .mockResolvedValue({ ...publishedRegistry, version: '2.0.0' });
  const { caller, context } = startRouterTestHost({
    registry: { readRegistry },
  });
  const before = await caller.agents.catalog();
  const row = context.database.select().from(agentCatalogCache).get();
  context.database.$client.exec(
    "CREATE TRIGGER reject_catalog_insert BEFORE INSERT ON agent_catalog_cache BEGIN SELECT RAISE(ABORT, 'cache is locked'); END",
  );
  const after = await caller.agents.catalog({ refresh: true });
  expect(after).toMatchObject({
    status: 'stale',
    error: expect.stringContaining('Failed query'),
    agents: before.agents,
    fetchedAt: before.fetchedAt,
    rejectedValues: 0,
  });
  expect(context.database.select().from(agentCatalogCache).get()).toEqual(row);
});

const offlineRegistry = {
  readRegistry: async (): Promise<never> => {
    throw new Error('Registry is offline');
  },
};
