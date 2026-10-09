import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const requestStatusesSql =
  'SELECT status FROM agent_catalog_sync_request ORDER BY sequence';

it('persists Refresh intent before fetching and shares its completion with another App', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  const first = host.caller.agents.syncCatalog();
  await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
  expect(
    host.database.$client
      .prepare('SELECT status FROM agent_catalog_sync_request')
      .all(),
  ).toEqual([{ status: 'pending' }]);
  const second = host.createCaller().agents.syncCatalog();
  await vi.waitFor(() =>
    expect(
      host.database.$client
        .prepare(
          'SELECT COUNT(DISTINCT sync_id) AS groups, COUNT(*) AS requests FROM agent_catalog_sync_request',
        )
        .get(),
    ).toEqual({ groups: 1, requests: 2 }),
  );
  response.resolve(publishedRegistry);
  expect(await first).toEqual(await second);
  expect(host.database.$client.prepare(requestStatusesSql).all()).toEqual([
    { status: 'succeeded' },
    { status: 'succeeded' },
  ]);
});

it('detaches an aborted App while its admitted Refresh commits for another App', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  const app = new AbortController();
  const first = host
    .createCaller({ signal: app.signal })
    .agents.syncCatalog()
    .catch((error: unknown) => error);
  await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
  app.abort();
  expect(await first).toMatchObject({
    message: expect.stringContaining('aborted'),
  });
  const second = host.caller.agents.syncCatalog();
  response.resolve(publishedRegistry);
  expect(await second).toMatchObject({ error: null });
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  expect(host.database.$client.prepare(requestStatusesSql).all()).toEqual([
    { status: 'succeeded' },
    { status: 'succeeded' },
  ]);
});

it('contains a failed SQL join and interrupts it before the next explicit fetch', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  const first = host.caller.agents.syncCatalog();
  await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
  host.database.$client.exec(
    "CREATE TEMP TRIGGER reject_catalog_join BEFORE UPDATE ON agent_catalog_sync_request WHEN NEW.sync_id <> OLD.sync_id BEGIN SELECT RAISE(ABORT, 'join failed'); END",
  );
  await expect(host.caller.agents.syncCatalog()).rejects.toThrow(
    'Failed query',
  );
  response.resolve(publishedRegistry);
  expect(await first).toMatchObject({ error: null });
  expect(host.database.$client.prepare(requestStatusesSql).all()).toEqual([
    { status: 'succeeded' },
    { status: 'pending' },
  ]);
  host.database.$client.exec('DROP TRIGGER reject_catalog_join');
  expect(await host.caller.agents.syncCatalog()).toMatchObject({ error: null });
  expect(fetchAgents).toHaveBeenCalledTimes(2);
  expect(host.database.$client.prepare(requestStatusesSql).all()).toEqual([
    { status: 'succeeded' },
    { status: 'interrupted' },
    { status: 'succeeded' },
  ]);
});
