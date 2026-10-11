import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { readAddedAgentRows } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

const savedLocalId = 'saved-local-id';

it('preserves saved local identity and custom rows across changed, removed and reappearing catalog entries', async (): Promise<void> => {
  const agent = publishedRegistry.agents[0];
  if (!agent) throw new Error('Registry mock needs an Agent');
  const changed = { ...agent, name: 'Updated Example', version: '2.0.0' };
  const fetchAgents = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce({ ...publishedRegistry, agents: [changed] })
    .mockResolvedValueOnce({ ...publishedRegistry, agents: [] })
    .mockResolvedValue({ ...publishedRegistry, agents: [agent] });
  const { caller, database } = await startEngineTestHost({
    fetchAgents,
  });
  database
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
  const custom = readAddedAgentRows(database)[1];
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect((await caller.agents.catalog()).agents).toMatchObject([
    { id: savedLocalId, entry: changed },
  ]);
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect((await caller.agents.catalog()).agents).toEqual([]);
  expect(readAddedAgentRows(database)[0]).toMatchObject({
    id: savedLocalId,
    catalogPresent: false,
    registryMetadata: JSON.stringify(changed),
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect((await caller.agents.catalog()).agents).toMatchObject([
    { id: savedLocalId, entry: agent },
  ]);
  expect(readAddedAgentRows(database)[1]).toEqual(custom);
});

it('gives new upstream entries distinct independent local identities', async (): Promise<void> => {
  const agent = publishedRegistry.agents[0];
  if (!agent) throw new Error('Registry mock needs an Agent');
  const registry = {
    ...publishedRegistry,
    agents: [agent, { ...agent, id: `${agent.id}-2` }],
  };
  const { caller } = await startEngineTestHost({
    fetchAgents: async (): Promise<unknown> => registry,
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const catalog = await caller.agents.catalog();
  expect(catalog.agents).toHaveLength(2);
  const [first, second] = catalog.agents;
  expect(first?.entry.id).toBe(agent.id);
  expect(first?.id).not.toBe(first?.entry.id);
  expect(second?.id).not.toBe(second?.entry.id);
  expect(first?.id).not.toBe(second?.id);
});

it('notifies catalog subscribers about removed Agents after the replacement commits', async (): Promise<void> => {
  const fetchAgents = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce(publishedRegistry)
    .mockResolvedValue({ ...publishedRegistry, agents: [] });
  const { caller, database, createCaller } = await startEngineTestHost({
    fetchAgents,
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const previousIds = database
    .select({ id: agents.id })
    .from(agents)
    .all()
    .map(({ id }) => id);
  const controller = new AbortController();
  const changes = await createCaller({
    signal: controller.signal,
  }).agents.catalogChanges();
  const notification = changes[Symbol.asyncIterator]().next();
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect(new Set((await notification).value)).toEqual(new Set(previousIds));
  expect((await caller.agents.catalog()).agents).toEqual([]);
  expect(
    database.select({ present: agents.catalogPresent }).from(agents).all(),
  ).toEqual(previousIds.map(() => ({ present: false })));
  controller.abort();
});
