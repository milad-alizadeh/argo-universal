import { createAgentMetadata } from '@repo/mocks/agent';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const exampleSearch = 'example';

it('browses upstream metadata through Agents without opening a conversation', async (): Promise<void> => {
  const fetchAgents = vi.fn<() => Promise<unknown>>(
    async () => publishedRegistry,
  );
  const adapter = createAgentMetadata();
  const connect = vi.spyOn(adapter, 'connect');
  const probe = vi.spyOn(adapter, 'probe');
  const { caller } = await startEngineTestHost({
    fetchAgents,
    adapters: [adapter],
  });
  const startupProbes = probe.mock.calls.length;
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .not.toMatch(/pending|running/);
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
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  expect(connect).not.toHaveBeenCalled();
  expect(probe).toHaveBeenCalledTimes(startupProbes);
});

it('shows the Server recipe rather than the App platform', async (): Promise<void> => {
  const { caller } = await startEngineTestHost({
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .not.toMatch(/pending|running/);
  const catalog = await caller.agents.catalog();
  const expectedByHost: Record<string, readonly string[]> = {
    'darwin:arm64': ['darwin-aarch64', 'binary', 'unsupported'],
    'darwin:x64': ['darwin-x86_64', 'unsupported', 'unsupported'],
    'linux:arm64': ['linux-aarch64', 'unsupported', 'unsupported'],
    'linux:x64': ['linux-x86_64', 'unsupported', 'unsupported'],
    'win32:x64': ['windows-x86_64', 'unsupported', 'binary'],
  };
  const expected = expectedByHost[`${process.platform}:${process.arch}`];
  if (!expected)
    throw new Error('Catalog test needs an expectation for this host');
  expect(catalog.serverPlatform).toBe(expected[0]);
  expect(
    catalog.agents.map(({ entry, support }) => [entry.id, support.kind]),
  ).toEqual([
    ['example-agent', 'npx'],
    ['python-agent', 'uvx'],
    ['binary-agent', expected[1]],
    ['windows-agent', expected[2]],
  ]);
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
