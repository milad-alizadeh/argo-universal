import type { ClientConnection, Stream } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { createScriptedAgentWire } from '#mocks/scripted-agent';
import { createAgentClient } from './client';

const modeUpdate = {
  sessionId: 'one',
  update: { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
};

type ClientHandlers = Partial<Parameters<typeof createAgentClient>[0]>;

// The real client with refusing handlers, overridden where a test observes one.
const connect = (stream: Stream, handlers: ClientHandlers): ClientConnection =>
  createAgentClient({
    stream,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
    ...handlers,
  });

it.each([
  {
    label: 'malformed notification',
    method: 'session/update',
    params: {
      sessionId: 'one',
      update: { sessionUpdate: 'agent_message_chunk' },
    },
    diagnostics: ['Error handling notification'],
  },
  {
    label: 'unknown notification',
    method: 'future/update',
    params: { anything: 'allowed' },
    diagnostics: [],
  },
])(
  'keeps $label outside the typed Session ingress with one SDK diagnostic at most',
  async ({ method, params, diagnostics }) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const peer = createScriptedAgentWire({
      steps: [],
      responses: {
        'session/new': [{ steps: [{ type: 'hold' }] }],
      },
    });

    const accepted: object[] = [];

    const connection = connect(peer.stream, {
      acceptSessionUpdate: (notification) => {
        accepted.push(notification);
      },
    });

    const barrier = connection.agent.request('session/new', {
      cwd: '/checkout',
      mcpServers: [],
    });

    const request = await peer.readRequest();
    await peer.send([
      { jsonrpc: '2.0', method, params },
      { jsonrpc: '2.0', method: 'session/update', params: modeUpdate },
      { jsonrpc: '2.0', id: request.id, result: { sessionId: 'one' } },
    ]);
    await barrier;
    expect(accepted).toEqual([modeUpdate]);
    await expect
      .poll(() => log.mock.calls.map(([line]) => line))
      .toEqual(diagnostics);
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
    const peer = createScriptedAgentWire({ steps: [] });
    let permissionCalls = 0;

    const connection = connect(peer.stream, {
      requestPermission: () => {
        permissionCalls += 1;

        return { outcome: { outcome: 'cancelled' } };
      },
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
  const peer = createScriptedAgentWire({
    steps: [],
    responses: {
      'session/prompt': [{ steps: [{ type: 'hold' }] }],
    },
  });

  const connection = connect(peer.stream, {});

  const prompt = connection.agent.request('session/prompt', {
    sessionId: 'one',
    prompt: [{ type: 'text', text: 'Start' }],
  });

  const rejection = prompt.catch((cause: unknown) => cause);
  const request = await peer.readRequest();
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
