import { once } from 'node:events';
import type { AgentLoginOperation, AgentLoginSnapshot } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket } from 'ws';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import {
  loginScenario,
  loginBrowserStep,
  loginOwner,
  otherLoginOwner,
  loginAgentId,
  loginMethodId,
  loginRequestId,
} from '#mocks/agent-login';
import { awaitSettledReadiness } from '#mocks/engine';

it('keeps exact browser ownership after the initiating App disconnects, then opens a normal authenticated Session', async () => {
  const host = await startAcpEngine(loginScenario([loginBrowserStep]));
  const socket = new WebSocket(host.url.replace('http:', 'ws:'));
  onTestFinished(() => socket.terminate());
  await once(socket, 'open');
  const response = once(socket, 'message');
  socket.send(
    JSON.stringify({
      id: 1,
      method: 'mutation',
      params: {
        path: 'agents.startLogin',
        input: { agentId: loginAgentId, ownerToken: loginOwner },
      },
    }),
  );
  const [frame] = await response;

  const admitted: { result: { data: AgentLoginSnapshot } } = JSON.parse(
    String(frame),
  );

  const operation: AgentLoginOperation = {
    operationId: admitted.result.data.operationId,
    ownerToken: loginOwner,
  };

  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('choose-method');
  await host.caller.agents.chooseLoginMethod({
    ...operation,
    methodId: loginMethodId,
  });
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('awaiting-browser');
  const disconnected = once(socket, 'close');
  socket.close();
  await disconnected;
  const query = encodeURIComponent(JSON.stringify(operation));
  const recovered = await fetch(`${host.url}/trpc/agents.login?input=${query}`);
  expect(await recovered.json()).toMatchObject({
    result: {
      data: {
        operationId: operation.operationId,
        status: 'awaiting-browser',
        request: {
          id: loginRequestId,
          url: 'https://login.example/device',
          message: 'Enter code ABCD-EFGH',
        },
      },
    },
  });
  const other = { ...operation, ownerToken: otherLoginOwner };
  expect(await host.caller.agents.login(other)).toEqual({
    operationId: operation.operationId,
    agentId: loginAgentId,
    status: 'other-app',
    methods: [],
  });
  await expect(host.caller.agents.cancelLogin(other)).rejects.toThrow(
    'another App',
  );
  await expect(
    host.caller.agents.answerLogin({
      ...other,
      requestId: loginRequestId,
      action: 'accept',
    }),
  ).rejects.toThrow('another App');
  await expect(
    host.caller.agents.answerLogin({
      ...operation,
      requestId: 'stale-request',
      action: 'accept',
    }),
  ).rejects.toThrow('pending');
  await host.caller.agents.answerLogin({
    ...operation,
    requestId: loginRequestId,
    action: 'accept',
  });
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('ready');
  expect(host.agent.processes[0]?.terminations).toBe(1);
  await awaitSettledReadiness(host.caller);
  await verifySessionAdmission(host, operation);
});

const verifySessionAdmission = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  operation: AgentLoginOperation,
): Promise<void> => {
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  const busy = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: loginOwner,
  });

  await expect
    .poll(
      async () =>
        (
          await host.caller.agents.login({
            ...operation,
            operationId: busy.operationId,
          })
        ).status,
    )
    .toBe('in-use');
  expect(host.agent.processes.at(-1)?.terminations).toBe(0);
  await host.caller.session.close({ sessionId });
};
