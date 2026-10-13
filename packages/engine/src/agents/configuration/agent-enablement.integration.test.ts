import { agentAdapters } from '@repo/agents';
import { expect, it } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

const [nativeAdapter] = agentAdapters;
if (!nativeAdapter) throw new Error('Engine needs a native Agent adapter');

it('a disabled native Agent admits no new Session', async () => {
  const host = await startCustomAgentEngine();
  const agentId = nativeAdapter.agent;
  await host.caller.agents.setEnabled({ agentId, enabled: false });
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: agentId,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow('cannot accept sessions.create');
});

it('disablement refuses new admission while an owned Session keeps its lifetime admission', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const input = {
    projectId: 'project-1',
    agent: registration.agentId,
    checkout: { type: 'main' as const },
    configOptions: [],
    prompt: [],
  };
  const created = await host.caller.session.new(input);
  await host.caller.agents.setEnabled({
    agentId: registration.agentId,
    enabled: false,
  });
  await expect(host.caller.session.new(input)).rejects.toThrow(
    'cannot accept sessions.create',
  );
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Continue owned work' }],
  });
  await expect
    .poll(
      async () =>
        (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
      { timeout: 5000 },
    )
    .toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'agent_message',
        state: 'settled',
      }),
    );
  await host.caller.session.close(created);
});
