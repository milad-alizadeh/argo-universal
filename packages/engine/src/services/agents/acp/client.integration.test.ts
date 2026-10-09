import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createAcpPeer, readAcpRequest } from '#mocks/acp-peer';
import { acpUpdates } from '#mocks/acp-updates';
import { createAgentClient } from './client';

const sessionId = 'session-one';
const jsonrpc = '2.0';
const promptMethod = 'session/prompt';
const newSessionId = 'new-session';
const updateMethod = 'session/update';

it.each(acpUpdates)(
  'accepts wire-earlier $sessionUpdate before immediate completion and closure',
  async (update) => {
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
    const completion = connection.agent
      .request(promptMethod, {
        sessionId: sessionId,
        prompt: [{ type: 'text', text: 'Start' }],
      })
      .then(() => {
        connection.close();
        return [...accepted];
      });
    const request = await readAcpRequest(peer);
    await peer.send([
      {
        jsonrpc: jsonrpc,
        method: updateMethod,
        params: { sessionId: sessionId, update },
      },
      { jsonrpc: jsonrpc, id: request.id, result: { stopReason: 'end_turn' } },
    ]);
    expect(await completion).toEqual([{ sessionId: sessionId, update }]);
    await connection.closed;
  },
);

it.each(acpUpdates)(
  'accepts wire-earlier $sessionUpdate before the next prompt',
  async (update) => {
    const peer = createAcpPeer();
    const accepted: { turn: number; notification: SessionNotification }[] = [];
    let turn = 1;
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: (notification) => {
        accepted.push({ turn, notification });
      },
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });
    const completion = connection.agent
      .request(promptMethod, {
        sessionId: sessionId,
        prompt: [{ type: 'text', text: 'First' }],
      })
      .then(() => {
        turn = 2;
        return connection.agent.request(promptMethod, {
          sessionId: sessionId,
          prompt: [{ type: 'text', text: 'Second' }],
        });
      });
    const first = await readAcpRequest(peer);
    await peer.send([
      {
        jsonrpc: jsonrpc,
        method: updateMethod,
        params: { sessionId: sessionId, update },
      },
      { jsonrpc: jsonrpc, id: first.id, result: { stopReason: 'end_turn' } },
    ]);
    const second = await readAcpRequest(peer);
    await peer.send([
      {
        jsonrpc: jsonrpc,
        method: updateMethod,
        params: { sessionId: sessionId, update },
      },
      { jsonrpc: jsonrpc, id: second.id, result: { stopReason: 'end_turn' } },
    ]);
    await completion;
    expect(accepted).toEqual([
      { turn: 1, notification: { sessionId: sessionId, update } },
      { turn: 2, notification: { sessionId: sessionId, update } },
    ]);
    connection.close();
    await connection.closed;
  },
);

it('accepts notifications before the new Session response identifies its Session', async () => {
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
  const opening = connection.agent
    .request('session/new', { cwd: '/checkout/one', mcpServers: [] })
    .then(() => [...accepted]);
  const request = await readAcpRequest(peer);
  await peer.send([
    {
      jsonrpc: jsonrpc,
      method: updateMethod,
      params: {
        sessionId: newSessionId,
        update: { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
      },
    },
    { jsonrpc: jsonrpc, id: request.id, result: { sessionId: newSessionId } },
  ]);
  expect(await opening).toEqual([
    {
      sessionId: newSessionId,
      update: { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
    },
  ]);
  connection.close();
  await connection.closed;
});
