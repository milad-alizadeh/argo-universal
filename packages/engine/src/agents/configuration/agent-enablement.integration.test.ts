import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

const admissionRefusal = 'cannot accept sessions.create';
const [registryAgent] = fixtureAgents;
if (!registryAgent)
  throw new Error('The cutover test needs a registry identity');

it('a disabled configured Agent admits no new Session', async () => {
  const host = await startCustomAgentEngine();
  const agentId = registryAgent.agent;
  await host.caller.agents.setEnabled({ agentId, enabled: false });
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: agentId,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow(admissionRefusal);
});

it('a registry identity with no installed release cannot fall back to a native Agent', async () => {
  const host = await startCustomAgentEngine();
  expect(
    host.openSessions.getSnapshot().can({
      type: 'sessions.create',
      sessionId: 'uninstalled-session',
      turnId: 'uninstalled-turn',
      projectId: 'project-1',
      projectPath: '/project',
      agent: registryAgent.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).toBe(false);
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: registryAgent.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow(admissionRefusal);
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
    admissionRefusal,
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
