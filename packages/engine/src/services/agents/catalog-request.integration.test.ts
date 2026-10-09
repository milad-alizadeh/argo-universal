import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('records a successful empty catalog and retains that accepted result through a failed Refresh', async (): Promise<void> => {
  let offline = false;
  const { caller } = await startEngineTestHost({
    fetchAgents: async () => {
      if (offline) throw new Error('Registry is offline');
      return { ...publishedRegistry, agents: [] };
    },
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const accepted = await caller.agents.catalog();
  expect(accepted).toMatchObject({
    status: 'fresh',
    agents: [],
    fetchedAt: expect.any(Number),
  });
  offline = true;
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .toBe('failed');
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'stale',
    agents: [],
    fetchedAt: accepted.fetchedAt,
  });
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
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  for (const search of ['éclair', '_', '%'])
    expect((await caller.agents.catalog({ search })).agents).toMatchObject([
      { entry: { name: 'Éclair_100%' } },
    ]);
  expect((await caller.agents.catalog({ search: 'eclair' })).agents).toEqual(
    [],
  );
  expect(fetchAgents).toHaveBeenCalledTimes(1);
});
