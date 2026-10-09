import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('accepts a durable sync before the upstream fetch completes and coalesces refreshes', async () => {
  const upstream = Promise.withResolvers<unknown>();
  let requests = 0;
  const host = await startEngineTestHost({
    fetchAgents: async () => {
      requests += 1;
      return upstream.promise;
    },
  });
  expect(await host.caller.agents.syncCatalog()).toEqual({ accepted: true });
  expect(await host.caller.agents.syncCatalog()).toEqual({ accepted: true });
  expect(await host.caller.agents.catalog()).toMatchObject({
    syncStatus: 'running',
    agents: [],
  });
  expect(requests).toBe(1);
  upstream.resolve(publishedRegistry);
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect((await host.caller.agents.catalog()).agents).toHaveLength(
    publishedRegistry.agents.length,
  );
});

it('coalesces concurrent callers into one durable job', async () => {
  const upstream = Promise.withResolvers<unknown>();
  let requests = 0;
  const host = await startEngineTestHost({
    fetchAgents: async () => {
      requests += 1;
      return upstream.promise;
    },
  });
  const first = host.createCaller();
  expect(
    await Promise.all([
      first.agents.syncCatalog(),
      host.caller.agents.syncCatalog(),
    ]),
  ).toEqual([{ accepted: true }, { accepted: true }]);
  expect(
    host.database.$client
      .prepare('SELECT source, scope, status FROM sync_jobs')
      .all(),
  ).toEqual([{ source: 'agent-catalog', scope: 'default', status: 'running' }]);
  upstream.resolve(publishedRegistry);
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect(requests).toBe(1);
  expect(
    host.database.$client
      .prepare('SELECT COUNT(*) AS jobs FROM sync_jobs')
      .get(),
  ).toEqual({ jobs: 1 });
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
