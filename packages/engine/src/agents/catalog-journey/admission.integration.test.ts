import { syncJobs } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { SessionRowUpdateJob } from '../../sessions';
import { writeDatabaseJobAndWaitForCommit } from '../../storage';

afterEach(() => vi.useRealTimers());

it('accepts and coalesces repeated and concurrent requests before the upstream fetch completes', async () => {
  const upstream = Promise.withResolvers<unknown>();
  let requests = 0;
  const host = await startEngineTestHost({
    fetchAgents: async () => {
      requests += 1;
      return upstream.promise;
    },
  });
  const first = host.createCaller();
  expect(
    await Promise.all([
      first.agents.syncCatalog(),
      host.caller.agents.syncCatalog(),
    ]),
  ).toEqual([{ accepted: true }, { accepted: true }]);
  expect(
    host.database.$client
      .prepare('SELECT source, scope, status FROM sync_jobs')
      .all(),
  ).toEqual([{ source: 'agent-catalog', scope: 'default', status: 'running' }]);
  expect(await host.caller.agents.syncCatalog()).toEqual({ accepted: true });
  expect(await host.caller.agents.catalog()).toMatchObject({
    syncStatus: 'running',
    agents: [],
  });
  expect(requests).toBe(1);
  upstream.resolve(publishedRegistry);
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect((await host.caller.agents.catalog()).agents).toHaveLength(
    publishedRegistry.agents.length,
  );
  expect(requests).toBe(1);
  expect(
    host.database.$client
      .prepare('SELECT COUNT(*) AS jobs FROM sync_jobs')
      .get(),
  ).toEqual({ jobs: 1 });
});

it('keeps sync admission pending while Session writes retry, then commits both through the same Writer', async () => {
  const { caller, database, databaseWriter } = await startEngineTestHost({
    fetchAgents: async () => publishedRegistry,
  });
  vi.useFakeTimers();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END",
  );
  await expect(
    writeDatabaseJobAndWaitForCommit(
      databaseWriter,
      new SessionRowUpdateJob({
        id: 'session-1',
        set: { title: 'Retried Session' },
      }),
    ),
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

it.each(['pending', 'running'] as const)(
  'resumes a %s catalog job after Engine startup',
  async (status) => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    stored.database
      .insert(syncJobs)
      .values({
        source: 'agent-catalog',
        scope: 'default',
        status,
        requestedAt: 1,
      })
      .run();
    const fetchAgents = vi.fn<() => Promise<unknown>>(
      async () => publishedRegistry,
    );
    const host = await startEngineTestHost({
      database: stored.database,
      fetchAgents,
    });
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe('idle');
    expect(fetchAgents).toHaveBeenCalledTimes(1);
    expect((await host.caller.agents.catalog()).agents).toHaveLength(
      publishedRegistry.agents.length,
    );
    expect(host.database.select().from(syncJobs).all()).toHaveLength(1);
  },
);
