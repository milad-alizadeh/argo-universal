import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

const statusSql = 'SELECT status FROM sync_jobs';

it.each(['commit', 'rollback'])(
  'drains an in-flight SQLite catalog %s before Engine closes the database',
  async (outcome) => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const host = await startEngineTestHost({
      database: stored.database,
      fetchAgents: async () => publishedRegistry,
    });
    await host.caller.agents.syncCatalog();
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe('idle');
    const before = stored.database.select().from(agents).all();
    let stopped: Promise<void> | undefined;
    host.database.$client.function('request_catalog_shutdown', () => {
      stopped ??= host.stop();
      return 0;
    });
    host.database.$client.exec(
      `CREATE TEMP TRIGGER stop_catalog BEFORE INSERT ON agents BEGIN SELECT request_catalog_shutdown(); ${outcome === 'rollback' ? "SELECT RAISE(ABORT, 'catalog rejected');" : ''} END`,
    );
    await host.caller.agents.syncCatalog();
    await expect.poll(() => stopped !== undefined).toBe(true);
    await stopped;
    expect(host.database.$client.isOpen).toBe(false);
    const after = before.map((row) => ({
      ...row,
      catalogSyncedAt: expect.any(Number),
    }));
    expect(stored.database.select().from(agents).all()).toEqual(
      outcome === 'rollback' ? before : after,
    );
    expect(stored.database.$client.prepare(statusSql).get()).toEqual({
      status: outcome === 'rollback' ? 'running' : 'idle',
    });
  },
);

it('preserves admission committed during shutdown for the next Engine to resume', async () => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const host = await startEngineTestHost({ database: stored.database });
  let stopped: Promise<void> | undefined;
  host.database.$client.function('stop_on_admission', () => {
    stopped = host.stop();
    return 0;
  });
  host.database.$client.exec(
    'CREATE TEMP TRIGGER stop_refresh BEFORE INSERT ON sync_jobs BEGIN SELECT stop_on_admission(); END',
  );
  await expect(host.caller.agents.syncCatalog()).rejects.toThrow('stopped');
  await stopped;
  expect(stored.database.$client.prepare(statusSql).get()).toEqual({
    status: 'pending',
  });
});

it('drains retained Session writes while stopping an active catalog fetch', async () => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const host = await startEngineTestHost({
    database: stored.database,
    fetchAgents: async () => new Promise(() => {}),
  });
  await host.caller.agents.syncCatalog();
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
  expect(
    stored.database.$client
      .prepare('SELECT title FROM session WHERE id = ?')
      .get('session-1'),
  ).toEqual({ title: 'Committed before close' });
  expect(stored.database.$client.prepare(statusSql).get()).toEqual({
    status: 'running',
  });
});
