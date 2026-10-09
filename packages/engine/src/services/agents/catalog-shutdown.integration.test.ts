import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startRouterTestHost } from '#mocks/router';

it.each([
  { outcome: 'commit', expectedError: null },
  {
    outcome: 'rollback',
    expectedError: expect.stringMatching(/^Failed query: insert into "agents"/),
  },
] as const)(
  'waits for a real SQLite $outcome when shutdown arrives during saving',
  async ({ outcome, expectedError }): Promise<void> => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const host = startRouterTestHost({
      database: stored.database,
      fetchAgents: async () => publishedRegistry,
    });
    await host.caller.agents.syncCatalog();
    const accepted = stored.database.select().from(agents).all();
    let stopped: Promise<void> | undefined;
    stored.database.$client.function('request_catalog_shutdown', () => {
      stopped = host.stop();
      expect(stored.database.$client.isTransaction).toBe(true);
      return 0;
    });
    host.databaseWriter.on('catalog.sqlCommitted', () =>
      expect(stored.database.$client.isTransaction).toBe(false),
    );
    const failure =
      outcome === 'rollback'
        ? "SELECT RAISE(ABORT, 'catalog write rejected');"
        : '';
    stored.database.$client.exec(
      `CREATE TEMP TRIGGER stop_catalog BEFORE INSERT ON agents BEGIN SELECT request_catalog_shutdown(); ${failure} END`,
    );
    const sync = host.caller.agents.syncCatalog();
    const result = outcome === 'rollback' ? await sync.catch((error: Error) => ({ error: error.message, changedIds: [] })) : await sync;
    expect(stopped).toBeDefined();
    await stopped;
    expect(host.databaseWriter.getSnapshot().status).toBe('done');
    expect(result).toMatchObject({
      error: expectedError,
      changedIds: outcome === 'rollback' ? [] : accepted.map(({ id }) => id),
    });
    const rows = stored.database.select().from(agents).all();
    const committedRows = accepted.map((row) => ({
      ...row,
      catalogSyncedAt: expect.any(Number),
    }));
    expect(rows).toEqual(outcome === 'rollback' ? accepted : committedRows);
  },
);
