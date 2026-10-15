import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const exampleAgentId = 'example-agent';

it('saves Registry Agents without installing and hides missing or unavailable entries', async () => {
  let entries = publishedRegistry.agents;

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: entries }),
  });

  const { agents } = host.caller;
  expect(await agents.servers()).toEqual([]);
  const registry = await agents.refreshRegistry();
  expect(registry.error).toBeNull();
  expect(registry.agents).toContainEqual({ entry: entries[0], support: 'npx' });
  await agents.addRegistry({ id: exampleAgentId });
  expect(await agents.servers()).toEqual([
    {
      id: exampleAgentId,
      name: 'Example Agent',
      icon: entries[0]?.icon,
      version: entries[0]?.version,
      env: {},
    },
  ]);
  entries = [];
  await agents.refreshRegistry();
  expect(await agents.servers()).toEqual([]);
  await agents.remove({ id: exampleAgentId });
});

it('omits unsupported saved Agents and preserves saved environment on repeated add', async () => {
  const host = await startEngineTestHost({
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  await host.caller.agents.refreshRegistry();
  await host.caller.agents.addRegistry({ id: 'python-agent' });
  await host.caller.agents.addRegistry({ id: exampleAgentId });
  host.database.$client
    .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
    .run('{"TOKEN":"saved"}', exampleAgentId);
  await host.caller.agents.addRegistry({ id: exampleAgentId });
  expect(await host.caller.agents.servers()).toMatchObject([
    { id: exampleAgentId, env: { TOKEN: 'saved' } },
  ]);
  await host.caller.agents.remove({ id: exampleAgentId });
  expect(await host.caller.agents.servers()).toEqual([]);
  expect(
    host.database.$client
      .prepare('SELECT id FROM agent_servers WHERE id = ?')
      .get(exampleAgentId),
  ).toBeUndefined();
});

it.each(['addRegistry', 'remove'] as const)(
  '%s drops reusable connections and retains live Session processes until shutdown',
  async (mutation) => {
    const scripted = scriptedEngineInput();

    const host = await startEngineTestHost({
      ...scripted,
      fetchAgents: async () => JSON.stringify(publishedRegistry),
    });

    await host.caller.agents.refreshRegistry();
    await host.caller.agents.addRegistry({ id: exampleAgentId });
    const resources = host.engine.getSnapshot().context.acpResources;
    const opening = createResourceOpening();
    opening.launch = { ...opening.launch, agentId: exampleAgentId };
    const first = await resources.open(opening);
    await host.caller.agents[mutation]({ id: exampleAgentId });
    expect(
      await first.agent.request('session/prompt', {
        sessionId: first.sessionId,
        prompt: [],
      }),
    ).toEqual({ stopReason: 'end_turn' });
    const second = await resources.open(opening);
    expect(scripted.agent.processes).toHaveLength(2);
    expect(
      scripted.agent.processes.map((process) => process.terminations),
    ).toEqual([0, 0]);
    await Promise.all([first.close(), second.close()]);
    await host.stop();
    expect(
      scripted.agent.processes.map((process) => process.terminations),
    ).toEqual([1, 1]);
  },
);
