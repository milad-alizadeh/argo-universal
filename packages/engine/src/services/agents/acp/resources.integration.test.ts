import { expect, it, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
  createResourceUpdate,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it('an owned empty session releases its process only after protocol closure', async () => {
  const close = Promise.withResolvers<void>();
  const requested: { sessionId: string }[] = [];
  const peer = createScriptedAgentProcess({
    steps: [],
    sessionIds: ['owned'],
    responses: {
      'session/close': [{ waitFor: close.promise, requests: requested }],
    },
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  expect(lease.sessionId).toBe('owned');
  const closing = lease.close();
  await vi.waitFor(() => expect(requested).toEqual([{ sessionId: 'owned' }]));
  const process = requireScriptedProcessAt(peer.processes);
  expect(process.terminations).toBe(0);
  close.resolve();
  await closing;
  expect(process.terminations).toBe(1);
});

it('compatible openings share startup and route early updates by the proven identity', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/new': [{ steps: [{ type: 'hold' }] }],
    },
  });
  const resources = createAcpResources(peer);
  const firstUpdates: ReturnType<typeof createResourceUpdate>[] = [];
  const secondUpdates: ReturnType<typeof createResourceUpdate>[] = [];
  const first = resources.open(
    createResourceOpening(createResourceDestination(firstUpdates)),
  );
  const second = resources.open(
    createResourceOpening(createResourceDestination(secondUpdates)),
  );
  const process = await vi.waitFor(() =>
    requireScriptedProcessAt(peer.processes),
  );
  expect((await process.readRequest()).method).toBe('initialize');
  const firstRequest = await process.readRequest();
  const secondRequest = await process.readRequest();
  await process.send([
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
  expect(peer.processes).toHaveLength(1);
  expect(firstUpdates).toEqual([createResourceUpdate('first')]);
  expect(secondUpdates).toEqual([createResourceUpdate('second')]);
  await resources.shutdown();
});
