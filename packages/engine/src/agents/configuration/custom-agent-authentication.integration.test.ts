import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect, it } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

it('saves a signed-out ACP program while reporting that its account still requires sign-in', async () => {
  const host = await startCustomAgentEngine();

  const definition = {
    ...customAgentDefinition,
    ...scriptedAgentCommand('signed-out'),
  };

  const registration = await host.caller.agents.registerCustom(definition);

  if (registration.status !== 'ready') throw new Error(registration.failure);
  expect(
    await host.caller.agents.recheck({ agentId: registration.agentId }),
  ).toEqual({
    status: 'sign-in-needed',
    reason: 'The Agent requires sign-in.',
  });
  expect(await host.caller.agents.configured()).toContainEqual({
    id: registration.agentId,
    enabled: true,
    configuration: { source: 'custom', definition },
  });
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({
      agent: registration.agentId,
      status: 'sign-in-needed',
    }),
  );
}, 20_000);
