import { agentCatalogCache } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startRouterTestHost } from '#mocks/router';

it('coalesces concurrent catalog requests into one registry read', async (): Promise<void> => {
  const pending = Promise.withResolvers<unknown>();
  const readRegistry = vi.fn<() => Promise<unknown>>(() => pending.promise);
  const { caller } = startRouterTestHost({ registry: { readRegistry } });
  const requests = [
    caller.agents.catalog(),
    caller.agents.catalog({ refresh: true }),
  ];
  await vi.waitFor(() => expect(readRegistry).toHaveBeenCalledTimes(1));
  pending.resolve(publishedRegistry);
  const results = await Promise.all(requests);
  expect(results.map((catalog) => catalog.status)).toEqual(['fresh', 'fresh']);
  expect(readRegistry).toHaveBeenCalledTimes(1);
});

it('stores accepted metadata and fetched time in the Server database', async (): Promise<void> => {
  const { caller, context } = startRouterTestHost({
    registry: { readRegistry: async (): Promise<unknown> => publishedRegistry },
  });
  const catalog = await caller.agents.catalog();
  const row = context.database.$client
    .prepare('select payload, fetched_at from agent_catalog_cache where id = 1')
    .get();
  expect(row).toEqual({
    payload: JSON.stringify(publishedRegistry),
    fetched_at: catalog.fetchedAt,
  });
});

it('rejects a malformed on-disk cache before serving metadata', async (): Promise<void> => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  stored.database
    .insert(agentCatalogCache)
    .values({ id: 1, payload: '{broken', fetchedAt: 1791504000000 })
    .run();
  const { caller } = startRouterTestHost({
    database: stored.database,
    runtimeDirectory: stored.directory,
    registry: {
      readRegistry: async (): Promise<never> => {
        throw new Error('Registry is offline');
      },
    },
  });
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    agents: [],
    error: 'Registry is offline',
    rejectedValues: 1,
  });
});
