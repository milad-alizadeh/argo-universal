import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startRouterTestHost } from '#mocks/router';
import { appRouter } from '../../engine/router';

const [exampleAgent, pythonAgent] = publishedRegistry.agents;
if (!exampleAgent || !pythonAgent)
  throw new Error('Registry mock needs package Agents');

it('rolls back every changed/removed row and timestamp when a later insert fails', async (): Promise<void> => {
  const changed = {
    ...publishedRegistry,
    agents: [
      { ...exampleAgent, name: 'Changed' },
      { ...pythonAgent, id: 'new-agent' },
    ],
  };
  const fetchAgents = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce(publishedRegistry)
    .mockResolvedValue(changed);
  const { caller, context } = startRouterTestHost({
    fetchAgents,
  });
  await caller.agents.syncCatalog();
  const before = context.database.select().from(agents).all();
  const controller = new AbortController();
  const observer = appRouter.createCaller(context, {
    signal: controller.signal,
  });
  const changes = await observer.agents.catalogChanges();
  const notification = changes[Symbol.asyncIterator]().next();
  context.database.$client.exec(
    "CREATE TRIGGER reject_new_agent BEFORE INSERT ON agents WHEN NEW.registry_id = 'new-agent' BEGIN SELECT RAISE(ABORT, 'catalog is locked'); END",
  );
  await expect(caller.agents.syncCatalog()).rejects.toThrow('Failed query');
  await vi.waitFor(async () => expect(await caller.agents.catalog()).toMatchObject({ status: 'stale' }));
  expect(context.database.select().from(agents).all()).toEqual(before);
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'stale',
    fetchedAt: before[0]?.catalogSyncedAt,
  });
  expect(await notification).toMatchObject({ value: before.map(({ id }) => id) });
  controller.abort();
});

it.each(['{broken', '{"id":"bad"}'])(
  'rejects corrupt stored Agent metadata %s once per hydration',
  async (metadata): Promise<void> => {
    const { caller, context } = startRouterTestHost();
    context.database
      .insert(agents)
      .values({
        id: 'saved',
        registryId: 'bad',
        registryMetadata: metadata,
        catalogPresent: true,
        catalogSyncedAt: 1,
      })
      .run();
    expect(await caller.agents.catalog()).toMatchObject({
      status: 'unavailable',
      agents: [],
      rejectedValues: 1,
      error: expect.stringMatching(/malformed/),
    });
  },
);

it('rejects malformed SQLite timestamps through the canonical Agent columns', async (): Promise<void> => {
  const { caller, context } = startRouterTestHost();
  context.database.$client
    .prepare('INSERT INTO agents (id, registry_id, registry_metadata, catalog_present, catalog_synced_at) VALUES (?, ?, ?, ?, ?)')
    .run(
      'saved',
      exampleAgent.id,
      JSON.stringify(publishedRegistry.agents[0]),
      1,
      'unknown',
    );
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    agents: [],
    rejectedValues: 1,
  });
});

it('reports a catalog row with missing metadata rather than hiding it as an empty catalog', async (): Promise<void> => {
  const { caller, context } = startRouterTestHost();
  context.database
    .insert(agents)
    .values({
      id: 'saved',
      registryId: 'missing-agent',
      catalogPresent: true,
      catalogSyncedAt: 1,
    })
    .run();
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    agents: [],
    rejectedValues: 1,
    error: expect.stringMatching(/malformed/),
  });
});
