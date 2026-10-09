import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

afterEach(() => vi.useRealTimers());

it('keeps sync admission pending while Session writes retry, then commits both through the same Writer', async () => {
  const { caller, database, databaseWriter } = await startEngineTestHost({
    fetchAgents: async () => publishedRegistry,
  });
  vi.useFakeTimers();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END",
  );
  await expect(
    writeDatabaseJobAndWaitForCommit(databaseWriter, {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Retried Session' },
    }),
  ).rejects.toThrow('Failed query');
  let accepted = false;
  const admission = caller.agents.syncCatalog().then(() => {
    accepted = true;
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(accepted).toBe(false);
  expect((await caller.agents.catalog()).agents).toEqual([]);
  database.$client.exec('DROP TRIGGER reject_session');
  await vi.advanceTimersByTimeAsync(1000);
  await admission;
  expect(
    database.$client
      .prepare('SELECT title FROM session WHERE id = ?')
      .get('session-1'),
  ).toEqual({ title: 'Retried Session' });
  expect((await caller.agents.catalog()).syncStatus).toBe('idle');
  expect(
    database.$client.prepare('SELECT status FROM sync_jobs').all(),
  ).toEqual([{ status: 'idle' }]);
});
