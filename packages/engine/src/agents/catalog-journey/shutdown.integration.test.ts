import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase, readAddedAgentRows } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { SessionRowUpdateJob } from '../../sessions';
import { writeDatabaseJobAndWaitForCommit } from '../../storage';
import type { FetchAgents } from '../index';

const statusSql = 'SELECT status FROM sync_jobs';
const rejection = "SELECT RAISE(ABORT, 'catalog rejected');";
const rejects = (outcome: string): boolean => outcome === 'rollback';
afterEach(() => vi.useRealTimers());

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
    const before = readAddedAgentRows(stored.database);
    let stopped: Promise<void> | undefined;
    host.database.$client.function('request_catalog_shutdown', () => {
      stopped ??= host.stop();
      return 0;
    });
    host.database.$client.exec(
      `CREATE TEMP TRIGGER stop_catalog BEFORE INSERT ON agents BEGIN SELECT request_catalog_shutdown(); ${rejects(outcome) ? rejection : ''} END`,
    );
    await host.caller.agents.syncCatalog();
    await expect.poll(() => stopped !== undefined).toBe(true);
    await stopped;
    expect(host.database.$client.isOpen).toBe(false);
    const after = before.map((row) => ({
      ...row,
      catalogSyncedAt: expect.any(Number),
    }));
    expect(readAddedAgentRows(stored.database)).toEqual(
      rejects(outcome) ? before : after,
    );
    expect(stored.database.$client.prepare(statusSql).get()).toEqual({
      status: rejects(outcome) ? 'running' : 'idle',
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
    writeDatabaseJobAndWaitForCommit(
      host.databaseWriter,
      new SessionRowUpdateJob({
        id: 'session-1',
        set: { title: 'Committed before close' },
      }),
    ),
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

it.each(['timeout', 'shutdown'] as const)(
  'ignores a late Registry response after %s',
  async (reason) => {
    const response = Promise.withResolvers<unknown>();
    const fetchAgents = vi.fn<FetchAgents>(() => response.promise);
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const host = await startEngineTestHost({
      fetchAgents,
      database: stored.database,
    });
    vi.useFakeTimers();
    await host.caller.agents.syncCatalog();
    await vi.advanceTimersByTimeAsync(0);
    await (reason === 'timeout'
      ? vi.advanceTimersByTimeAsync(20_000)
      : host.stop());
    expect(fetchAgents.mock.calls[0]?.[0].aborted).toBe(true);
    await host.stop();
    response.resolve(publishedRegistry);
    await vi.advanceTimersByTimeAsync(0);
    expect(readAddedAgentRows(stored.database)).toEqual([]);
  },
);

it('does not start a Registry read after Server shutdown admission closes', async () => {
  const fetchAgents = vi.fn<FetchAgents>(async () => publishedRegistry);
  const { caller, stop } = await startEngineTestHost({ fetchAgents });
  await stop();
  await expect(caller.agents.syncCatalog()).rejects.toThrow('aborted');
  expect(fetchAgents).not.toHaveBeenCalled();
});
