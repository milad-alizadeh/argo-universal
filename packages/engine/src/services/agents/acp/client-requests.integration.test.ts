import type {
  ClientRequestContext,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createAcpPeer } from '#mocks/acp-peer';
import { acpPermission } from '#mocks/acp-requests';
import { createAgentClient } from './client';

const permissionId = 'permission-one';
const permissionMethod = 'session/request_permission';

it('preserves request IDs when two permission responses settle in reverse order', async () => {
  const peer = createAcpPeer();
  const arrived = Promise.withResolvers<void>();
  const first = Promise.withResolvers<RequestPermissionResponse>();
  const second = Promise.withResolvers<RequestPermissionResponse>();
  const pending: ClientRequestContext<RequestPermissionRequest>[] = [];
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: (context) => {
      pending.push(context);
      if (pending.length === 2) arrived.resolve();
      return context.requestId === permissionId
        ? first.promise
        : second.promise;
    },
    createElicitation: () => ({ action: 'cancel' }),
  });
  await peer.send([
    {
      jsonrpc: '2.0',
      id: permissionId,
      method: permissionMethod,
      params: acpPermission,
    },
    {
      jsonrpc: '2.0',
      id: 48,
      method: permissionMethod,
      params: { ...acpPermission, sessionId: 'session-two' },
    },
  ]);
  await arrived.promise;
  second.resolve({ outcome: { outcome: 'selected', optionId: 'reject-read' } });
  const secondResponse = await peer.receive();
  first.resolve({ outcome: { outcome: 'selected', optionId: 'read-once' } });
  const firstResponse = await peer.receive();
  expect({
    ids: pending.map(({ requestId }) => requestId),
    responses: [secondResponse, firstResponse],
  }).toEqual({
    ids: [permissionId, 48],
    responses: [
      {
        jsonrpc: '2.0',
        id: 48,
        result: { outcome: { outcome: 'selected', optionId: 'reject-read' } },
      },
      {
        jsonrpc: '2.0',
        id: permissionId,
        result: { outcome: { outcome: 'selected', optionId: 'read-once' } },
      },
    ],
  });
  connection.close();
  await connection.closed;
});

it('cancels the protocol request signal while retaining its connection', async () => {
  const peer = createAcpPeer();
  const pending =
    Promise.withResolvers<ClientRequestContext<RequestPermissionRequest>>();
  const answer = Promise.withResolvers<RequestPermissionResponse>();
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: (context) => {
      pending.resolve(context);
      context.signal.addEventListener(
        'abort',
        () => answer.resolve({ outcome: { outcome: 'cancelled' } }),
        { once: true },
      );
      return answer.promise;
    },
    createElicitation: () => ({ action: 'cancel' }),
  });
  await peer.send([
    {
      jsonrpc: '2.0',
      id: permissionId,
      method: permissionMethod,
      params: acpPermission,
    },
  ]);
  const context = await pending.promise;
  await peer.send([
    {
      jsonrpc: '2.0',
      method: '$/cancel_request',
      params: { requestId: permissionId },
    },
  ]);
  const response = await peer.receive();
  expect({
    aborted: context.signal.aborted,
    connected: !connection.signal.aborted,
    response,
  }).toEqual({
    aborted: true,
    connected: true,
    response: {
      jsonrpc: '2.0',
      id: permissionId,
      result: { outcome: { outcome: 'cancelled' } },
    },
  });
  connection.close();
  await connection.closed;
});
