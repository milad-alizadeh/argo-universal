import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  loginScenario,
  loginOwner,
  otherLoginOwner,
  loginAgentId,
  loginMethodId,
} from '#mocks/agent-login';

const chooseMethod = 'choose-method';

it('times out a held authentication request and closes its finite process before reporting timeout', async () => {
  const host = await startAcpEngine({
    ...loginScenario([{ type: 'hold' }]),
    loginTimeoutMs: 500,
  });
  const sessionsBefore = await host.caller.session.list({ archived: false });
  const started = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: loginOwner,
  });
  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe(chooseMethod);
  await host.caller.agents.chooseLoginMethod({
    ...operation,
    methodId: loginMethodId,
  });
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('timed-out');
  expect(host.agent.processes[0]?.terminations).toBe(1);
  expect(await host.caller.session.list({ archived: false })).toEqual(
    sessionsBefore,
  );
});

it('Engine shutdown cancels and observes the login process without creating a Session', async () => {
  const host = await startAcpEngine(loginScenario([{ type: 'hold' }]));
  const started = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: loginOwner,
  });
  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe(chooseMethod);
  await host.caller.agents.chooseLoginMethod({
    ...operation,
    methodId: loginMethodId,
  });
  await host.stop();
  expect(host.engine.getSnapshot().status).toBe('done');
  expect((await host.caller.agents.login(operation)).status).toBe('cancelled');
  expect(host.agent.processes[0]?.terminations).toBe(1);
  await expect(
    host.caller.agents.startLogin({
      agentId: loginAgentId,
      ownerToken: loginOwner,
    }),
  ).rejects.toThrow('This operation was aborted');
});

it('concurrent Apps share a single owned login and cancellation awaits process exit', async () => {
  const host = await startAcpEngine({ ...loginScenario(), autoExit: false });
  const first = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: loginOwner,
  });
  const second = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: otherLoginOwner,
  });
  expect(second).toMatchObject({
    operationId: first.operationId,
    status: 'other-app',
  });
  const operation = { operationId: first.operationId, ownerToken: loginOwner };
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe(chooseMethod);
  await host.caller.agents.cancelLogin(operation);
  await expect.poll(() => host.agent.processes[0]?.terminations).toBe(1);
  expect((await host.caller.agents.login(operation)).status).toBe('closing');
  expect(
    await host.caller.agents.startLogin({
      agentId: loginAgentId,
      ownerToken: loginOwner,
    }),
  ).toMatchObject({ operationId: first.operationId, status: 'closing' });
  host.agent.processes[0]?.exited.resolve();
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('cancelled');
});
