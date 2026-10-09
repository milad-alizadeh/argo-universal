import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('persists each Refresh completion as its own correlated SQL request', async (): Promise<void> => {
  const { caller, database } = await startEngineTestHost({
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  expect(await caller.agents.syncCatalog()).toMatchObject({ error: null });
  expect(
    database.$client
      .prepare(
        'SELECT status, error FROM agent_catalog_sync_request ORDER BY sequence',
      )
      .all(),
  ).toEqual([{ status: 'succeeded', error: null }]);
});

it('records a successful empty catalog and retains that accepted result through a failed Refresh', async (): Promise<void> => {
  let offline = false;
  const { caller, database } = await startEngineTestHost({
    fetchAgents: async () => {
      if (offline) throw new Error('Registry is offline');
      return { ...publishedRegistry, agents: [] };
    },
  });
  expect(await caller.agents.syncCatalog()).toMatchObject({
    error: null,
    changedIds: [],
  });
  const accepted = await caller.agents.catalog();
  expect(accepted).toMatchObject({
    status: 'fresh',
    agents: [],
    fetchedAt: expect.any(Number),
  });
  offline = true;
  expect(await caller.agents.syncCatalog()).toMatchObject({
    error: 'Registry is offline',
  });
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'stale',
    agents: [],
    fetchedAt: accepted.fetchedAt,
  });
  expect(
    database.$client
      .prepare(
        'SELECT status FROM agent_catalog_sync_request ORDER BY sequence',
      )
      .all(),
  ).toEqual([{ status: 'succeeded' }, { status: 'failed' }]);
});

it('interrupts abandoned SQL requests before a fresh explicit fetch after storage recovers', async (): Promise<void> => {
  const fetchAgents = vi.fn<() => Promise<unknown>>(
    async () => publishedRegistry,
  );
  const { caller, database } = await startEngineTestHost({ fetchAgents });
  database.$client.exec(
    "CREATE TRIGGER reject_catalog BEFORE INSERT ON agents BEGIN SELECT RAISE(ABORT, 'catalog write failed'); END; CREATE TRIGGER reject_completion BEFORE UPDATE ON agent_catalog_sync_request BEGIN SELECT RAISE(ABORT, 'completion write failed'); END",
  );
  await expect(caller.agents.syncCatalog()).rejects.toThrow('Failed query');
  await vi.waitFor(() =>
    expect(
      database.$client
        .prepare('SELECT status FROM agent_catalog_sync_request')
        .all(),
    ).toEqual([{ status: 'pending' }]),
  );
  expect(
    database.$client
      .prepare('SELECT status FROM agent_catalog_sync_request')
      .all(),
  ).toEqual([{ status: 'pending' }]);
  database.$client.exec(
    'DROP TRIGGER reject_catalog; DROP TRIGGER reject_completion',
  );
  expect(await caller.agents.syncCatalog()).toMatchObject({ error: null });
  expect(fetchAgents).toHaveBeenCalledTimes(2);
  expect(
    database.$client
      .prepare(
        'SELECT status FROM agent_catalog_sync_request ORDER BY sequence',
      )
      .all(),
  ).toEqual([{ status: 'interrupted' }, { status: 'succeeded' }]);
});

it('keeps literal substring search local, including percent, underscore and Unicode lowercasing', async (): Promise<void> => {
  const agent = publishedRegistry.agents[0];
  if (!agent) throw new Error('Registry mock needs an Agent');
  const fetchAgents = vi.fn<() => Promise<unknown>>(async () => ({
    ...publishedRegistry,
    agents: [
      { ...agent, name: 'Éclair_100%' },
      { ...agent, id: 'plain', name: 'Plain' },
    ],
  }));
  const { caller } = await startEngineTestHost({ fetchAgents });
  await caller.agents.syncCatalog();
  for (const search of ['éclair', '_', '%'])
    expect((await caller.agents.catalog({ search })).agents).toMatchObject([
      { entry: { name: 'Éclair_100%' } },
    ]);
  expect((await caller.agents.catalog({ search: 'eclair' })).agents).toEqual(
    [],
  );
  expect(fetchAgents).toHaveBeenCalledTimes(1);
});
