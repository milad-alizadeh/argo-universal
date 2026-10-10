import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createScriptedAgentWire } from '#mocks/scripted-agent';
import { createAgentClient } from './client';

it('keeps a cancelled prompt observed until its final content and completion arrive', async () => {
  const peer = createScriptedAgentWire({
    steps: [],
    responses: {
      'session/prompt': [{ steps: [{ type: 'hold' }] }],
      'session/new': [{ steps: [{ type: 'hold' }] }],
    },
  });
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
    .request('session/prompt', {
      sessionId: 'one',
      prompt: [{ type: 'text', text: 'Start' }],
    })
    .then((result) => ({ result, accepted: [...accepted] }));
  const request = await peer.readRequest();
  const cancelled = connection.agent.notify('session/cancel', {
    sessionId: 'one',
  });
  const cancellation = await peer.receive();
  await cancelled;
  await peer.send([
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'one',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Final output' },
        },
      },
    },
    { jsonrpc: '2.0', id: request.id, result: { stopReason: 'cancelled' } },
  ]);
  expect({ cancellation, completion: await completion }).toEqual({
    cancellation: {
      jsonrpc: '2.0',
      method: 'session/cancel',
      params: { sessionId: 'one' },
    },
    completion: {
      result: { stopReason: 'cancelled' },
      accepted: [
        {
          sessionId: 'one',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'Final output' },
          },
        },
      ],
    },
  });
  connection.close();
  await connection.closed;
});

it('rejects pending outgoing work when its ACP connection closes', async () => {
  const peer = createScriptedAgentWire({
    steps: [],
    responses: {
      'session/prompt': [{ steps: [{ type: 'hold' }] }],
      'session/new': [{ steps: [{ type: 'hold' }] }],
    },
  });
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });
  const opening = connection.agent
    .request('session/new', { cwd: '/checkout', mcpServers: [] })
    .catch((error: unknown) => error);
  await peer.readRequest();
  connection.close(new Error('ACP resource closed'));
  await connection.closed;
  expect(await opening).toMatchObject({ message: 'ACP resource closed' });
});
