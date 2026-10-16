import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from './index';

it('routes only associated Subagent updates to their owner and releases the association on close', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  onTestFinished(() => resources.shutdown());
  const firstUpdates: SessionNotification[] = [];
  const secondUpdates: SessionNotification[] = [];

  const first = await resources.open(
    createResourceOpening(createResourceDestination(firstUpdates)),
  );

  const second = await resources.open(
    createResourceOpening(createResourceDestination(secondUpdates)),
  );

  const process = requireScriptedProcessAt(peer.processes);
  await process.play(
    [
      {
        type: 'update',
        sessionId: 'unknown',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Unassociated' },
        },
      },
      {
        type: 'update',
        update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
      },
      {
        type: 'update',
        sessionId: 'child',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Child' },
        },
      },
    ],
    first.sessionId,
  );
  expect(firstUpdates.map((entry) => entry.sessionId)).toEqual([
    first.sessionId,
    'child',
  ]);
  await process.play(
    [
      {
        type: 'update',
        update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
      },
    ],
    second.sessionId,
  );
  expect(secondUpdates).toEqual([]);
  expect(
    await process.connection.client.request('session/request_permission', {
      sessionId: 'child',
      toolCall: { toolCallId: 'read-only' },
      options: [],
    }),
  ).toEqual({ outcome: { outcome: 'cancelled' } });
  await first.close();
  await process.play(
    [
      {
        type: 'update',
        sessionId: 'child',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Released' },
        },
      },
    ],
    first.sessionId,
  );
  expect(firstUpdates).toHaveLength(2);
});
