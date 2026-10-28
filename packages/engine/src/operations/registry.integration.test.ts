import { publishedRegistry } from '@repo/mocks/registry/catalog';
import type { TRPCClient } from '@trpc/client';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';
import type { AppRouter } from '../engine/router';

const exampleAgentId = 'example-agent';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

async function operationHost(): Promise<{
  host: EngineHost;
  caller: TRPCClient<AppRouter>;
}> {
  const host = await startEngineTestHost({
    fixtureAgents: [],
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  const caller = await operationCaller(host);

  return { host, caller };
}

it('refreshes the Registry through an Operation', async () => {
  const { caller } = await operationHost();

  const result = await caller.operations.run.mutate({
    id: 'registry.refresh',
    params: {},
  });

  expect(result).toMatchObject({
    error: null,
    agents: expect.arrayContaining([
      { entry: publishedRegistry.agents[0], support: 'npx' },
    ]),
  });
});

it('reads the cached Registry through an Operation', async () => {
  const { host, caller } = await operationHost();
  const cached = await host.caller.registry.refresh();

  const result = await caller.operations.run.mutate({
    id: 'registry.get',
    params: {},
  });

  expect(result).toEqual(cached);
});

it('syncs the Registry through an Operation', async () => {
  const { host, caller } = await operationHost();
  const cached = await host.caller.registry.refresh();

  const result = await caller.operations.run.mutate({
    id: 'registry.sync',
    params: {},
  });

  expect(result).toEqual(cached);
});

it('installs a Registry Agent through an Operation', async () => {
  const { host, caller } = await operationHost();
  await host.caller.registry.refresh();

  await caller.operations.run.mutate({
    id: 'agent.install',
    params: { id: exampleAgentId },
  });

  expect(await host.caller.agent.list()).toMatchObject([
    { id: exampleAgentId, name: 'Example Agent', env: {} },
  ]);
});

it('lists Installed Agents through an Operation', async () => {
  const { host, caller } = await operationHost();
  await host.caller.registry.refresh();
  await host.caller.agent.install({ id: exampleAgentId });

  const result = await caller.operations.run.mutate({
    id: 'agent.list',
    params: {},
  });

  expect(result).toEqual(await host.caller.agent.list());
});

it('removes an Installed Agent through an Operation', async () => {
  const { host, caller } = await operationHost();
  await host.caller.registry.refresh();
  await host.caller.agent.install({ id: exampleAgentId });

  await caller.operations.run.mutate({
    id: 'agent.remove',
    params: { id: exampleAgentId },
  });

  expect(await host.caller.agent.list()).toEqual([]);
});

it('discovers Registry mutations as confirm Operations', async () => {
  const { caller } = await operationHost();
  const rows = await caller.operations.list.query();

  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'registry.get', tier: 'read' }),
      expect.objectContaining({ id: 'agent.list', tier: 'read' }),
      expect.objectContaining({ id: 'registry.refresh', tier: 'confirm' }),
      expect.objectContaining({ id: 'registry.sync', tier: 'confirm' }),
      expect.objectContaining({ id: 'agent.install', tier: 'confirm' }),
      expect.objectContaining({ id: 'agent.remove', tier: 'confirm' }),
    ]),
  );
});
