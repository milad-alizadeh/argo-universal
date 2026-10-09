import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

const retriedSessionTitle = 'Retried Session';

afterEach(() => vi.useRealTimers());

it('rejects catalog admission while Session row writes retry and cannot commit it later', async (): Promise<void> => {
  const { caller, database, databaseWriter } = await startEngineTestHost({
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  vi.useFakeTimers();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END",
  );
  await expect(
    writeDatabaseJobAndWaitForCommit(databaseWriter, {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: retriedSessionTitle },
    }),
  ).rejects.toThrow('Failed query');
  await expect(caller.agents.syncCatalog()).rejects.toThrow(
    'Writer cannot commit',
  );
  expect((await caller.agents.catalog()).agents).toEqual([]);
  database.$client.exec('DROP TRIGGER reject_session');
  await vi.advanceTimersByTimeAsync(1_000);
  expect(
    database.$client
      .prepare('SELECT title FROM session WHERE id = ?')
      .get('session-1'),
  ).toEqual({ title: retriedSessionTitle });
  expect((await caller.agents.catalog()).agents).toEqual([]);
  expect(
    database.$client
      .prepare('SELECT status FROM agent_catalog_sync_request')
      .all(),
  ).toEqual([]);
});

it('discards a rolled-back catalog replacement while retrying the Session write from its batch', async () => {
  const { database, databaseWriter, caller } = await startEngineTestHost();
  vi.useFakeTimers();
  database.$client.exec(
    "CREATE TEMP TRIGGER reject_changed_session BEFORE UPDATE ON session WHEN NEW.title = 'Retried Session' BEGIN SELECT RAISE(ABORT, 'Session update failed'); END",
  );
  const first = writeDatabaseJobAndWaitForCommit(databaseWriter, {
    type: 'sessionRowUpdate',
    id: 'session-1',
    set: { title: 'First batch' },
  });
  const catalog = writeDatabaseJobAndWaitForCommit(databaseWriter, {
    type: 'agentCatalogReplace',
    syncId: 'replacement',
    syncedAt: 1,
    rejectedValues: 0,
    rows: [
      {
        id: 'rejected-agent',
        registryId: 'example',
        registryMetadata: '{}',
        catalogPresent: true,
        catalogSyncedAt: 1,
        catalogSearchText: 'example',
      },
    ],
  });
  const session = writeDatabaseJobAndWaitForCommit(databaseWriter, {
    type: 'sessionRowUpdate',
    id: 'session-1',
    set: { title: retriedSessionTitle },
  });
  const results = await Promise.allSettled([first, catalog, session]);
  expect(results.map(({ status }) => status)).toEqual([
    'fulfilled',
    'rejected',
    'rejected',
  ]);
  expect(database.$client.prepare('SELECT id FROM agents').all()).toEqual([]);
  database.$client.exec('DROP TRIGGER reject_changed_session');
  await vi.advanceTimersByTimeAsync(1_000);
  expect(
    database.$client
      .prepare('SELECT title FROM session WHERE id = ?')
      .get('session-1'),
  ).toEqual({ title: retriedSessionTitle });
  expect((await caller.agents.catalog()).agents).toEqual([]);
});
