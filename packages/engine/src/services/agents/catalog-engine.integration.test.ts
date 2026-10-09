import { agents, session } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

it('serves its SQLite last-good catalog over HTTP after the actual Engine restarts offline', async (): Promise<void> => {
  const stored = openTestDatabase();
  const history = stored.database.select().from(session).all();
  stored.database.$client.close();
  onTestFinished(stored.remove);
  const fetchAgents = vi.fn<() => Promise<unknown>>(
    async (): Promise<unknown> => publishedRegistry,
  );
  const first = await startEngineTestHost({
    home: stored.directory,
    fetchAgents,
  });
  expect(fetchAgents).not.toHaveBeenCalled();
  const beforeSync = await fetch(`${first.url}/trpc/agents.catalog`);
  expect(await beforeSync.json()).toMatchObject({
    result: { data: { agents: [], status: 'unavailable' } },
  });
  expect(fetchAgents).not.toHaveBeenCalled();
  await fetch(`${first.url}/trpc/agents.syncCatalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  await expect
    .poll(async () => (await first.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const accepted = await fetch(`${first.url}/trpc/agents.catalog`);
  expect(accepted.status).toBe(200);
  expect(await accepted.json()).toMatchObject({
    result: {
      data: {
        status: 'fresh',
        rejectedValues: 0,
        agents: expect.arrayContaining([
          expect.objectContaining({ entry: publishedRegistry.agents[0] }),
        ]),
      },
    },
  });
  const row = first.database.select().from(agents).all();
  await first.stop();
  const restarted = await startEngineTestHost({
    home: stored.directory,
    fetchAgents: async (): Promise<never> => {
      throw new Error('Registry is offline');
    },
  });
  await fetch(`${restarted.url}/trpc/agents.syncCatalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  await expect
    .poll(async () => (await restarted.caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .toBe('failed');
  const stale = await fetch(`${restarted.url}/trpc/agents.catalog`);
  expect(stale.status).toBe(200);
  expect(await stale.json()).toMatchObject({
    result: {
      data: {
        status: 'stale',
        rejectedValues: 0,
        error: 'Registry is offline',
        fetchedAt: row?.[0]?.catalogSyncedAt,
        agents: expect.arrayContaining([
          expect.objectContaining({ entry: publishedRegistry.agents[0] }),
        ]),
      },
    },
  });
  const { database } = restarted;
  expect(database?.select().from(agents).all()).toEqual(row);
  expect(database?.select().from(session).all()).toEqual(history);
});
