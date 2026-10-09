import { agentCatalogCache, session } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { startCatalogEngine } from '#mocks/catalog-engine';
import { openTestDatabase } from '#mocks/database';

it('serves its SQLite last-good catalog over HTTP after the actual Engine restarts offline', async (): Promise<void> => {
  const stored = openTestDatabase();
  const history = stored.database.select().from(session).all();
  stored.database.$client.close();
  onTestFinished(stored.remove);
  const first = await startCatalogEngine(stored.directory, {
    readRegistry: async (): Promise<unknown> => publishedRegistry,
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
    .from(agentCatalogCache)
    .get();
  await first.stop();
  const restarted = await startCatalogEngine(stored.directory, {
    readRegistry: async (): Promise<never> => {
      throw new Error('Registry is offline');
    },
  });
  const stale = await fetch(restarted.url);
  expect(stale.status).toBe(200);
  expect(await stale.json()).toMatchObject({
    result: {
      data: {
        status: 'stale',
        rejectedValues: 0,
        error: 'Registry is offline',
        fetchedAt: row?.fetchedAt,
        agents: expect.arrayContaining([
          expect.objectContaining({ entry: publishedRegistry.agents[0] }),
        ]),
      },
    },
  });
  const database = restarted.engine.getSnapshot().context.database;
  expect(database?.select().from(agentCatalogCache).get()).toEqual(row);
  expect(database?.select().from(session).all()).toEqual(history);
});
