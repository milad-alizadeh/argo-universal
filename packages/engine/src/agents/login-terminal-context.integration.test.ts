import { expect, it } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import { resourceInitialization } from '#mocks/acp-resource';
import {
  loginScenario,
  loginOwner,
  accountStatus,
  loginStatusStep,
} from '#mocks/agent-login';
import { customAgentDefinition } from '#mocks/custom-agent';
import { createLoginTerminalMock } from '#mocks/login-terminal';

it('passes through the legacy authentication reservation and preserves the advertised terminal environment', async () => {
  const terminal = createLoginTerminalMock();

  const host = await startAcpEngine({
    ...loginScenario(),
    responses: { initialize: [{ steps: [loginStatusStep(accountStatus)] }] },
    initialize: {
      ...resourceInitialization,
      authMethods: [
        {
          type: 'terminal',
          id: 'terminal',
          name: 'Terminal',
          env: { HOME: '/account-b' },
        },
      ],
    },
    launchLoginTerminal: terminal.launchLoginTerminal,
  });

  const first = await host.caller.agents.registerCustom({
    ...customAgentDefinition,
    name: 'Account A',
    env: [{ name: 'HOME', value: '/account-a' }],
  });

  const second = await host.caller.agents.registerCustom({
    ...customAgentDefinition,
    name: 'Account B',
    env: [{ name: 'HOME', value: '/account-b' }],
  });

  if (first.status !== 'ready') throw new Error(first.failure);

  if (second.status !== 'ready') throw new Error(second.failure);

  const session = await host.caller.session.new({
    ...emptySessionInput,
    agent: second.agentId,
  });

  const started = await host.caller.agents.startLogin({
    agentId: first.agentId,
    ownerToken: loginOwner,
  });

  const identity = { operationId: started.operationId, ownerToken: loginOwner };
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe('choose-method');
  await host.caller.agents.chooseLoginMethod({
    ...identity,
    methodId: 'terminal',
  });
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe('authenticating');
  expect(terminal.writes).toEqual([]);
  await host.caller.session.close(session);
}, 15_000);
