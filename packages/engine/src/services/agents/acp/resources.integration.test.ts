import { expect, it } from 'vitest';
import { createAcpPeer, readAcpRequest } from '#mocks/acp-peer';
import {
  createResourceDestination,
  resourceInitialization,
  createResourceOpening,
  createResourceUpdate,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';
import type { AcpProcess } from '../index';

it('an owned empty session releases its process only after protocol closure', async () => {
  const peer = createAcpPeer();
  const exited = Promise.withResolvers<void>();
  let terminations = 0;
  const resources = createAcpResources({
    launchProcess: async () => ({
      stream: peer.stream,
      exited: exited.promise,
      terminate: async (): Promise<void> => {
        terminations += 1;
        exited.resolve();
      },
    }),
  });
  const opening = resources.open(createResourceOpening());
  const initialize = await readAcpRequest(peer);
  await peer.send([
    { jsonrpc: '2.0', id: initialize.id, result: resourceInitialization },
  ]);
  const create = await readAcpRequest(peer);
  await peer.send([
    { jsonrpc: '2.0', id: create.id, result: { sessionId: 'owned' } },
  ]);
  const lease = await opening;
  expect(lease.sessionId).toBe('owned');
  const closing = lease.close();
  const close = await readAcpRequest(peer);
  expect(close).toMatchObject({
    method: 'session/close',
    params: { sessionId: 'owned' },
  });
  expect(terminations).toBe(0);
  await peer.send([{ jsonrpc: '2.0', id: close.id, result: {} }]);
  await closing;
  expect(terminations).toBe(1);
});

it('compatible openings share startup and route early updates by the proven identity', async () => {
  const peer = createAcpPeer();
  let launches = 0;
  const exited = Promise.withResolvers<void>();
  const resources = createAcpResources({
    launchProcess: async (): Promise<AcpProcess> => {
      launches += 1;
      return {
        stream: peer.stream,
        exited: exited.promise,
        terminate: async () => exited.resolve(),
      };
    },
  });
  const firstUpdates: ReturnType<typeof createResourceUpdate>[] = [];
  const secondUpdates: ReturnType<typeof createResourceUpdate>[] = [];
  const first = resources.open(
    createResourceOpening(createResourceDestination(firstUpdates)),
  );
  const second = resources.open(
    createResourceOpening(createResourceDestination(secondUpdates)),
  );
  const initialize = await readAcpRequest(peer);
  await peer.send([
    { jsonrpc: '2.0', id: initialize.id, result: resourceInitialization },
  ]);
  const firstRequest = await readAcpRequest(peer);
  const secondRequest = await readAcpRequest(peer);
  await peer.send([
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: createResourceUpdate('second'),
    },
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: createResourceUpdate('first'),
    },
    { jsonrpc: '2.0', id: secondRequest.id, result: { sessionId: 'second' } },
    { jsonrpc: '2.0', id: firstRequest.id, result: { sessionId: 'first' } },
  ]);
  await Promise.all([first, second]);
  expect(launches).toBe(1);
  expect(firstUpdates).toEqual([createResourceUpdate('first')]);
  expect(secondUpdates).toEqual([createResourceUpdate('second')]);
  await resources.shutdown();
});
