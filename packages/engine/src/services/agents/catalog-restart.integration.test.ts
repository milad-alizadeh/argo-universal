import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { agents, syncJobs } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
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
  await expect
    .poll(async () => (await first.caller.agents.catalog()).syncStatus)
    .toBe('idle');
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
  await expect
    .poll(async () => (await restarted.caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .toBe('failed');
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

it.each(['pending', 'running'] as const)(
  'resumes a %s catalog job after Engine startup',
  async (status) => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    stored.database
      .insert(syncJobs)
      .values({
        source: 'agent-catalog',
        scope: 'default',
        status,
        requestedAt: 1,
      })
      .run();
    const fetchAgents = vi.fn<() => Promise<unknown>>(
      async () => publishedRegistry,
    );
    const host = await startEngineTestHost({
      database: stored.database,
      fetchAgents,
    });
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe('idle');
    expect(fetchAgents).toHaveBeenCalledTimes(1);
    expect((await host.caller.agents.catalog()).agents).toHaveLength(
      publishedRegistry.agents.length,
    );
    expect(host.database.select().from(syncJobs).all()).toHaveLength(1);
  },
);
