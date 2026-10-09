import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

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
    const result = await host.caller.agents
      .syncCatalog()
      .catch((error: Error) => ({ error: error.message, changedIds: [] }));
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

it('interrupts committed Refresh intent when shutdown begins inside its admission transaction', async () => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const host = await startEngineTestHost({
    database: stored.database,
    fetchAgents: rejectUnexpectedRegistryFetch,
  });
  let stopped: Promise<void> | undefined;
  host.database.$client.function('stop_on_refresh_admission', () => {
    stopped = host.stop();
    return 0;
  });
  host.database.$client.exec(
    'CREATE TEMP TRIGGER stop_refresh BEFORE INSERT ON agent_catalog_sync_request BEGIN SELECT stop_on_refresh_admission(); END',
  );
  const result = await host.caller.agents.syncCatalog();
  expect(result).toMatchObject({
    changedIds: [],
    error: 'Registry sync was interrupted',
  });
  await stopped;
  expect(host.database.$client.isOpen).toBe(false);
  expect(
    stored.database.$client
      .prepare('SELECT status FROM agent_catalog_sync_request')
      .all(),
  ).toEqual([{ status: 'interrupted' }]);
});

function rejectUnexpectedRegistryFetch(): never {
  throw new Error('Shutdown must not start a Registry fetch');
}

it('commits a failed Session prefix and the final interruption before closing SQLite', async () => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const pendingFetch = Promise.withResolvers<unknown>();
  const fetchAgents = vi.fn<() => Promise<unknown>>(() => pendingFetch.promise);
  const host = await startEngineTestHost({
    database: stored.database,
    fetchAgents,
  });
  const refresh = host.caller.agents
    .syncCatalog()
    .catch((error: unknown) => error);
  await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
  host.database.$client.exec(
    "CREATE TEMP TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'storage busy'); END",
  );
  await expect(
    writeDatabaseJobAndWaitForCommit(host.databaseWriter, {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Committed before close' },
    }),
  ).rejects.toThrow('Failed query');
  host.database.$client.exec('DROP TRIGGER reject_session');
  await host.stop();
  await refresh;
  expect(host.database.$client.isOpen).toBe(false);
  expect(
    stored.database.$client
      .prepare('SELECT title FROM session WHERE id = ?')
      .get('session-1'),
  ).toEqual({ title: 'Committed before close' });
  expect(
    stored.database.$client
      .prepare('SELECT status FROM agent_catalog_sync_request')
      .all(),
  ).toEqual([{ status: 'interrupted' }]);
});
