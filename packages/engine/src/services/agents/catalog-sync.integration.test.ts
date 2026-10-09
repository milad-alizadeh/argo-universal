import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import {
  legacyLocalAgentId,
  legacyRegistryAgentId,
} from '#mocks/legacy-catalog-identities';
import { startRouterTestHost } from '#mocks/router';
import { appRouter } from '../../engine/router';

const savedLocalId = 'saved-local-id';

it('reads SQLite without fetching, then commits an explicit page visit sync', async (): Promise<void> => {
  const readRegistry = vi.fn<() => Promise<unknown>>(
    async (): Promise<unknown> => publishedRegistry,
  );
  const { caller } = startRouterTestHost({ registry: { readRegistry } });
  expect(await caller.agents.catalog()).toMatchObject({
    agents: [],
    status: 'unavailable',
  });
  expect(readRegistry).not.toHaveBeenCalled();
  expect(await caller.agents.syncCatalog()).toMatchObject({ error: null });
  expect(await caller.agents.catalog({ search: 'example' })).toMatchObject({
    agents: [{ entry: publishedRegistry.agents[0] }],
    status: 'fresh',
  });
  expect(readRegistry).toHaveBeenCalledTimes(1);
});

it('coalesces concurrent Apps and publishes changed IDs after the SQLite commit', async (): Promise<void> => {
  const pending = Promise.withResolvers<unknown>();
  const readRegistry = vi.fn<() => Promise<unknown>>(() => pending.promise);
  const { caller, context } = startRouterTestHost({
    registry: { readRegistry },
  });
  const signal = new AbortController();
  const secondApp = appRouter.createCaller(context, { signal: signal.signal });
  const subscription = await secondApp.agents.catalogChanges();
  const changed = subscription[Symbol.asyncIterator]().next();
  const firstVisit = caller.agents.syncCatalog();
  const secondVisit = secondApp.agents.syncCatalog();
  await vi.waitFor(() => expect(readRegistry).toHaveBeenCalledTimes(1));
  expect(context.database.select().from(agents).all()).toEqual([]);
  pending.resolve(publishedRegistry);
  const results = await Promise.all([firstVisit, secondVisit]);
  const notification = await changed;
  expect(results[0]).toEqual(results[1]);
  expect(notification.value).toEqual(results[0]?.changedIds);
  expect((await secondApp.agents.catalog()).agents.map(({ id }) => id)).toEqual(
    notification.value,
  );
  signal.abort();
});

it('preserves saved local identity and custom rows across changed, removed and reappearing catalog entries', async (): Promise<void> => {
  const agent = publishedRegistry.agents[0];
  if (!agent) throw new Error('Registry mock needs an Agent');
  const changed = { ...agent, name: 'Updated Example', version: '2.0.0' };
  const readRegistry = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce({ ...publishedRegistry, agents: [changed] })
    .mockResolvedValueOnce({ ...publishedRegistry, agents: [] })
    .mockResolvedValue({ ...publishedRegistry, agents: [agent] });
  const { caller, context } = startRouterTestHost({
    registry: { readRegistry },
  });
  context.database
    .insert(agents)
    .values([
      {
        id: savedLocalId,
        registryId: agent.id,
        registryMetadata: JSON.stringify(agent),
        catalogPresent: true,
        catalogSyncedAt: 1,
      },
      { id: 'custom-local-id' },
    ])
    .run();
  const custom = context.database.select().from(agents).all()[1];
  await caller.agents.syncCatalog();
  expect((await caller.agents.catalog()).agents).toMatchObject([
    { id: savedLocalId, entry: changed },
  ]);
  await caller.agents.syncCatalog();
  expect((await caller.agents.catalog()).agents).toEqual([]);
  expect(context.database.select().from(agents).all()[0]).toMatchObject({
    id: savedLocalId,
    catalogPresent: false,
    registryMetadata: JSON.stringify(changed),
  });
  await caller.agents.syncCatalog();
  expect((await caller.agents.catalog()).agents).toMatchObject([
    { id: savedLocalId, entry: agent },
  ]);
  expect(context.database.select().from(agents).all()[1]).toEqual(custom);
});

it('gives new upstream IDs independent local identities without colliding with legacy rows', async (): Promise<void> => {
  const agent = publishedRegistry.agents[0];
  if (!agent) throw new Error('Registry mock needs an Agent');
  const registry = {
    ...publishedRegistry,
    agents: [
      { ...agent, id: legacyRegistryAgentId },
      { ...agent, id: legacyLocalAgentId },
    ],
  };
  const { caller } = startRouterTestHost({
    registry: { readRegistry: async (): Promise<unknown> => registry },
  });
  expect(await caller.agents.syncCatalog()).toMatchObject({ error: null });
  const catalog = await caller.agents.catalog();
  expect(catalog.agents).toHaveLength(2);
  expect(catalog.agents[0]).toMatchObject({
    id: legacyLocalAgentId,
    entry: { id: legacyRegistryAgentId },
  });
  expect(catalog.agents[1]?.id).not.toBe(legacyLocalAgentId);
  expect(catalog.agents[1]?.id).not.toBe(legacyRegistryAgentId);
});
