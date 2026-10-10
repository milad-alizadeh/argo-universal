import type {
  CreateElicitationRequest,
  ClientRequestContext,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createAcpPeer } from '#mocks/acp-peer';
import { createAgentClient } from './client';

const requestId = 'question-one';

it('retains exact protocol correlation for a form elicitation response', async () => {
  const peer = createAcpPeer();
  const incoming =
    Promise.withResolvers<ClientRequestContext<CreateElicitationRequest>>();
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: (context) => {
      incoming.resolve(context);
      return { action: 'accept', content: { choice: 'exact-offered-value' } };
    },
  });
  await peer.send([
    {
      jsonrpc: '2.0',
      id: requestId,
      method: 'elicitation/create',
      params: {
        mode: 'form',
        sessionId: 'session-one',
        message: 'Choose',
        requestedSchema: {
          type: 'object',
          properties: { choice: { type: 'string' } },
        },
      },
    },
  ]);
  const context = await incoming.promise;
  expect({
    requestId: context.requestId,
    scope: context.params,
    response: await peer.receive(),
  }).toEqual({
    requestId,
    scope: {
      mode: 'form',
      sessionId: 'session-one',
      message: 'Choose',
      requestedSchema: {
        type: 'object',
        properties: { choice: { type: 'string' } },
      },
    },
    response: {
      jsonrpc: '2.0',
      id: requestId,
      result: { action: 'accept', content: { choice: 'exact-offered-value' } },
    },
  });
  connection.close();
  await connection.closed;
});
