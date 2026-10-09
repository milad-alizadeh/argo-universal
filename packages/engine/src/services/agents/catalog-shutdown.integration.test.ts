import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

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
    const host = await startEngineTestHost({
      database: stored.database,
      fetchAgents: async () => publishedRegistry,
    });
    await host.caller.agents.syncCatalog();
    const accepted = stored.database.select().from(agents).all();
    let stopped: Promise<void> | undefined;
    host.database.$client.function('request_catalog_shutdown', () => {
      stopped = host.stop();
      expect(host.database.$client.isTransaction).toBe(true);
      return 0;
    });
    const failure =
      outcome === 'rollback'
        ? "SELECT RAISE(ABORT, 'catalog write rejected');"
        : '';
    host.database.$client.exec(
      `CREATE TEMP TRIGGER stop_catalog BEFORE INSERT ON agents BEGIN SELECT request_catalog_shutdown(); ${failure} END`,
    );
    const result = await host.caller.agents.syncCatalog();
    expect(stopped).toBeDefined();
    await stopped;
    expect(host.database.$client.isOpen).toBe(false);
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
