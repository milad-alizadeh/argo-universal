import { agents, session } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startCatalogEngine } from '#mocks/catalog-engine';
import { openTestDatabase } from '#mocks/database';

it('serves its SQLite last-good catalog over HTTP after the actual Engine restarts offline', async (): Promise<void> => {
  const stored = openTestDatabase();
  const history = stored.database.select().from(session).all();
  stored.database.$client.close();
  onTestFinished(stored.remove);
  const fetchAgents = vi.fn<() => Promise<unknown>>(
    async (): Promise<unknown> => publishedRegistry,
  );
  const first = await startCatalogEngine(stored.directory, fetchAgents);
  expect(fetchAgents).not.toHaveBeenCalled();
  const beforeSync = await fetch(first.url);
  expect(await beforeSync.json()).toMatchObject({
    result: { data: { agents: [], status: 'unavailable' } },
  });
  expect(fetchAgents).not.toHaveBeenCalled();
  await fetch(first.url.replace('agents.catalog', 'agents.syncCatalog'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const accepted = await fetch(first.url);
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
  const row = first.engine
    .getSnapshot()
    .context.database?.select()
    .from(agents)
    .all();
  await first.stop();
  const restarted = await startCatalogEngine(
    stored.directory,
    async (): Promise<never> => {
      throw new Error('Registry is offline');
    },
  );
  await fetch(restarted.url.replace('agents.catalog', 'agents.syncCatalog'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const stale = await fetch(restarted.url);
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
  const database = restarted.engine.getSnapshot().context.database;
  expect(database?.select().from(agents).all()).toEqual(row);
  expect(database?.select().from(session).all()).toEqual(history);
});
