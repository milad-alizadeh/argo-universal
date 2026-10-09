import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

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
  const { caller, database, createCaller } = await startEngineTestHost({
    fetchAgents,
  });
  await caller.agents.syncCatalog();
  const before = database.select().from(agents).all();
  const controller = new AbortController();
  const observer = createCaller({
    signal: controller.signal,
  });
  const changes = await observer.agents.catalogChanges();
  const notification = changes[Symbol.asyncIterator]().next();
  database.$client.exec(
    "CREATE TRIGGER reject_new_agent BEFORE INSERT ON agents WHEN NEW.registry_id = 'new-agent' BEGIN SELECT RAISE(ABORT, 'catalog is locked'); END",
  );
  expect(await caller.agents.syncCatalog()).toMatchObject({
    error: expect.stringContaining('Failed query'),
  });
  expect(database.select().from(agents).all()).toEqual(before);
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'stale',
    fetchedAt: before[0]?.catalogSyncedAt,
  });
  controller.abort();
  expect(await notification).toMatchObject({ done: true });
});

it.each(['{broken', '{"id":"bad"}'])(
  'rejects corrupt stored Agent metadata %s once per hydration',
  async (metadata): Promise<void> => {
    const { caller, database } = await startEngineTestHost();
    database
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
  const { caller, database } = await startEngineTestHost();
  database.$client
    .prepare('INSERT INTO agents VALUES (?, ?, ?, ?, ?)')
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
  const { caller, database } = await startEngineTestHost();
  database
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
