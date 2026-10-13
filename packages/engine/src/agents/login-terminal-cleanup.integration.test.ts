import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import { resourceInitialization } from '#mocks/acp-resource';
import { loginOwner } from '#mocks/agent-login';
import { createLoginTerminalMock } from '#mocks/login-terminal';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

it('retains login ownership when fresh ACP initialization cannot observe cleanup', async () => {
  const initial = createScriptedAgentProcess({
    steps: [],
    initialize: {
      ...resourceInitialization,
      authMethods: [{ type: 'terminal', id: 'terminal', name: 'Terminal' }],
    },
  });
  const fresh = createScriptedAgentProcess({
    steps: [],
    initialize: { protocolVersion: 1 },
    autoExit: false,
  });
  const terminal = createLoginTerminalMock();
  let launches = 0;
  const host = await startAcpEngine({
    steps: [],
    closeTimeoutMs: 20,
    launchLoginTerminal: terminal.launchLoginTerminal,
    launchProcess: (launch) =>
      ++launches === 1
        ? initial.launchProcess(launch)
        : fresh.launchProcess(launch),
  });
  onTestFinished(() => {
    for (const child of fresh.processes) child.exited.resolve();
    host.engine.stop();
    host.database.$client.close();
  });
  const started = await host.caller.agents.startLogin({
    agentId: 'mock',
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
  await expect.poll(() => launches).toBe(1);
  terminal.exited.resolve({ exitCode: 0 });
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe('cleanup-failed');
  expect(
    await host.caller.agents.startLogin({
      agentId: 'mock',
      ownerToken: loginOwner,
    }),
  ).toMatchObject({
    operationId: started.operationId,
    status: 'cleanup-failed',
  });
  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    /login|sign-in|in use/i,
  );
});
