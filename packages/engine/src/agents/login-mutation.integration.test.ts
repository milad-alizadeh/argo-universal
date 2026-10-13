import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { loginScenario, loginOwner } from '#mocks/agent-login';
import { customAgentDefinition } from '#mocks/custom-agent';

it('refuses a custom Agent edit before probing or saving while its login owns the configuration', async () => {
  const host = await startAcpEngine(loginScenario());
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const configured = await host.caller.agents.configured();
  const started = await host.caller.agents.startLogin({
    agentId: registration.agentId,
    ownerToken: loginOwner,
  });
  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('choose-method');
  const processesBeforeEdit = host.agent.processes.length;
  await expect(
    host.caller.agents.editCustom({
      agentId: registration.agentId,
      definition: { ...customAgentDefinition, name: 'Changed name' },
    }),
  ).rejects.toThrow('in use');
  expect(host.agent.processes.length).toBe(processesBeforeEdit);
  expect(await host.caller.agents.configured()).toEqual(configured);
});
