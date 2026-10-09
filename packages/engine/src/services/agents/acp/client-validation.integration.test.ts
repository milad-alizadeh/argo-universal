import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createAcpPeer, readAcpRequest } from '#mocks/acp-peer';
import { createAgentClient } from './client';

it.each([
  {
    label: 'malformed notification',
    method: 'session/update',
    params: {
      sessionId: 'one',
      update: { sessionUpdate: 'agent_message_chunk' },
    },
  },
  {
    label: 'unknown notification',
    method: 'future/update',
    params: { anything: 'allowed' },
  },
])(
  'keeps $label outside the typed Session ingress',
  async ({ method, params }) => {
    const peer = createAcpPeer();
    const accepted: SessionNotification[] = [];
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: (notification) => {
        accepted.push(notification);
      },
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });
    const barrier = connection.agent.request('session/new', {
      cwd: '/checkout',
      mcpServers: [],
    });
    const request = await readAcpRequest(peer);
    await peer.send([
      { jsonrpc: '2.0', method, params },
      {
        jsonrpc: '2.0',
        method: 'session/update',
        params: {
          sessionId: 'one',
          update: {
            sessionUpdate: 'current_mode_update',
            currentModeId: 'plan',
          },
        },
      },
      { jsonrpc: '2.0', id: request.id, result: { sessionId: 'one' } },
    ]);
    await barrier;
    expect(accepted).toEqual([
      {
        sessionId: 'one',
        update: { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
      },
    ]);
    connection.close();
    await connection.closed;
  },
);

it.each([
  {
    label: 'malformed permission',
    method: 'session/request_permission',
    params: { sessionId: 'one' },
    code: -32602,
  },
  {
    label: 'unknown request',
    method: 'future/request',
    params: {},
    code: -32601,
  },
])(
  'returns a correlated SDK rejection for $label',
  async ({ method, params, code }) => {
    const peer = createAcpPeer();
    let permissionCalls = 0;
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: () => {},
      requestPermission: () => {
        permissionCalls += 1;
        return { outcome: { outcome: 'cancelled' } };
      },
      createElicitation: () => ({ action: 'cancel' }),
    });
    await peer.send([{ jsonrpc: '2.0', id: 'bad-request', method, params }]);
    expect({ response: await peer.receive(), permissionCalls }).toEqual({
      response: expect.objectContaining({
        jsonrpc: '2.0',
        id: 'bad-request',
        error: expect.objectContaining({ code }),
      }),
      permissionCalls: 0,
    });
    connection.close();
    await connection.closed;
  },
);

it('rejects a malformed response envelope for its pending prompt', async () => {
  const peer = createAcpPeer();
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });
  const prompt = connection.agent.request('session/prompt', {
    sessionId: 'one',
    prompt: [{ type: 'text', text: 'Start' }],
  });
  const rejection = prompt.catch((error: unknown) => error);
  const request = await readAcpRequest(peer);
  await peer.sendRaw(
    JSON.stringify({
      jsonrpc: '2.0',
      id: request.id,
      result: { stopReason: 'end_turn' },
      error: { code: -1, message: 'ambiguous' },
    }),
  );
  expect(await rejection).toMatchObject({
    code: -32600,
    message: 'Invalid request',
  });
  connection.close();
  await connection.closed;
});
