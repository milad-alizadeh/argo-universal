import { createMockAdapter } from '@repo/mocks/agent';
import {
  publishedRegistry,
  malformedRegistry,
} from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startRouterTestHost } from '#mocks/router';

const exampleSearch = 'example';
const offlineMessage = 'Registry is offline';

it('browses upstream metadata through Agents without opening a conversation', async (): Promise<void> => {
  const readRegistry = vi.fn<() => Promise<unknown>>(
    async () => publishedRegistry,
  );
  const adapter = createMockAdapter();
  const connect = vi.spyOn(adapter, 'connect');
  const probe = vi.spyOn(adapter, 'probe');
  const { caller } = startRouterTestHost({
    registry: { readRegistry },
    adapters: [adapter],
  });
  const startupProbes = probe.mock.calls.length;
  await caller.agents.syncCatalog();
  const catalog = await caller.agents.catalog({ search: exampleSearch });
  expect(catalog).toMatchObject({
    status: 'fresh',
    error: null,
    rejectedValues: 0,
    agents: [{ entry: publishedRegistry.agents[0], support: { kind: 'npx' } }],
  });
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toHaveLength(1);
  expect(readRegistry).toHaveBeenCalledTimes(1);
  expect(connect).not.toHaveBeenCalled();
  expect(probe).toHaveBeenCalledTimes(startupProbes);
});

it.each(['offline', 'malformed'] as const)(
  'keeps last-good metadata after a %s refresh',
  async (failure): Promise<void> => {
    const readRegistry = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(publishedRegistry);
    const { caller } = startRouterTestHost({ registry: { readRegistry } });
    await caller.agents.syncCatalog();
    if (failure === 'offline')
      readRegistry.mockRejectedValue(new Error(offlineMessage));
    else readRegistry.mockResolvedValue(malformedRegistry);
    await caller.agents.syncCatalog();
    const refreshed = await caller.agents.catalog({
      search: exampleSearch,
    });
    expect(refreshed).toMatchObject({
      status: 'stale',
      error: expect.stringMatching(/offline|malformed/),
      rejectedValues: failure === 'malformed' ? 1 : 0,
      agents: [{ entry: publishedRegistry.agents[0] }],
    });
    const searched = await caller.agents.catalog({ search: 'PYTHON' });
    expect(searched.agents.map(({ entry }) => entry.id)).toEqual([
      'python-agent',
    ]);
    expect(readRegistry).toHaveBeenCalledTimes(2);
  },
);

it('shows the Server recipe rather than the App platform', async (): Promise<void> => {
  const { caller } = startRouterTestHost({
    platform: 'darwin-aarch64',
    registry: { readRegistry: async (): Promise<unknown> => publishedRegistry },
  });
  await caller.agents.syncCatalog();
  const catalog = await caller.agents.catalog();
  expect(catalog.serverPlatform).toBe('darwin-aarch64');
  expect(
    catalog.agents.map(({ entry, support }) => [entry.id, support.kind]),
  ).toEqual([
    ['example-agent', 'npx'],
    ['python-agent', 'uvx'],
    ['binary-agent', 'binary'],
    ['windows-agent', 'unsupported'],
  ]);
});

it('reports malformed registry JSON once without a success-shaped empty catalog', async (): Promise<void> => {
  const { caller } = startRouterTestHost({
    registry: { readRegistry: async (): Promise<unknown> => '{broken' },
  });
  await caller.agents.syncCatalog();
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    rejectedValues: 1,
    error: 'Registry JSON is malformed',
    agents: [],
  });
});
