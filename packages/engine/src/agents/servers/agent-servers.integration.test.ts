import { publishedRegistry } from '@repo/mocks/registry/catalog';
import {
  identityRegistry,
  registryIdentities,
} from '@repo/mocks/registry/identities';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const exampleAgentId = 'example-agent';

const startPublishedHost = async (): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>>
> => {
  const host = await startEngineTestHost({
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  await host.caller.registry.refresh();

  return host;
};

it('lists Registry entries with their launch support', async () => {
  const host = await startEngineTestHost({
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  const registry = await host.caller.registry.refresh();
  expect(registry.error).toBeNull();
  expect(registry.agents).toContainEqual({
    entry: publishedRegistry.agents[0],
    support: 'npx',
  });
});

it.each(registryIdentities)(
  'saves $name using its Registry id and name without downloading it',
  async ({ id, name }) => {
    const host = await startEngineTestHost({
      fixtureAgents: [],
      fetchAgents: async () => JSON.stringify(identityRegistry),
    });

    await host.caller.registry.refresh();
    expect(await host.caller.agent.list()).toEqual([]);
    await host.caller.agent.install({ id });
    expect(await host.caller.agent.list()).toEqual([
      {
        id,
        name,
        version: '1.2.3',
        icon: identityRegistry.agents[0]?.icon,
        env: {},
      },
    ]);
    expect((await host.caller.registry.get()).agents).toContainEqual({
      entry: expect.objectContaining({ id, name }),
      support: 'npx',
    });
    await host.caller.agent.remove({ id });
    expect(await host.caller.agent.list()).toEqual([]);
  },
);

it('hides a saved Agent once the Registry drops it', async () => {
  let entries = publishedRegistry.agents;

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: entries }),
  });

  await host.caller.registry.refresh();
  await host.caller.agent.install({ id: exampleAgentId });
  entries = [];
  await host.caller.registry.refresh();
  expect(await host.caller.agent.list()).toEqual([]);
});

it('omits a saved Agent whose Registry distribution is unsupported', async () => {
  const host = await startPublishedHost();
  await host.caller.agent.install({ id: 'python-agent' });
  expect(await host.caller.agent.list()).toEqual([]);
});

it('keeps the saved environment when an Agent is added again', async () => {
  const host = await startPublishedHost();
  await host.caller.agent.install({ id: exampleAgentId });
  host.database.$client
    .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
    .run('{"TOKEN":"saved"}', exampleAgentId);
  await host.caller.agent.install({ id: exampleAgentId });
  expect(await host.caller.agent.list()).toMatchObject([
    { id: exampleAgentId, env: { TOKEN: 'saved' } },
  ]);
});

it('deletes the saved Agent row on remove', async () => {
  const host = await startPublishedHost();
  await host.caller.agent.install({ id: exampleAgentId });
  await host.caller.agent.remove({ id: exampleAgentId });
  expect(await host.caller.agent.list()).toEqual([]);
  expect(
    host.database.$client
      .prepare('SELECT id FROM agent_servers WHERE id = ?')
      .get(exampleAgentId),
  ).toBeUndefined();
});
