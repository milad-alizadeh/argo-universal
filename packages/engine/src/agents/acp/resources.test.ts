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
import type { AcpSessionDestination } from './index';
import { createAcpResources } from './index';

it('closing a Session drains protocol closure and keeps its shared process alive', async () => {
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
  expect(process.terminations).toBe(0);
  await resources.shutdown();
});

it('concurrent openings share startup and route updates immediately after their responses', async () => {
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
    { jsonrpc: '2.0', id: secondRequest.id, result: { sessionId: 'second' } },
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: createResourceUpdate('second'),
    },
    { jsonrpc: '2.0', id: firstRequest.id, result: { sessionId: 'first' } },
    {
      jsonrpc: '2.0',
      method: 'session/update',
      params: createResourceUpdate('first'),
    },
  ]);
  await Promise.all([first, second]);
  expect(peer.processes).toHaveLength(1);
  expect(firstUpdates).toEqual([createResourceUpdate('first')]);
  expect(secondUpdates).toEqual([createResourceUpdate('second')]);
  await resources.shutdown();
});

it('a rejected startup is forgotten, so the next open starts a fresh process', async () => {
  const failed = createScriptedAgentProcess({
    autoExit: false,
    steps: [],
    responses: { initialize: [{ error: 'Startup refused' }] },
  });

  const ready = createScriptedAgentProcess({ steps: [] });
  let attempts = 0;

  const resources = createAcpResources({
    launchProcess: (launch) =>
      (++attempts === 1 ? failed : ready).launchProcess(launch),
  });

  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'Startup refused',
  );
  const lease = await resources.open(createResourceOpening());
  failed.processes[0]?.exited.resolve();
  expect(attempts).toBe(2);
  expect(lease.sessionId).toBe('owned-1');
  await resources.shutdown();
});

it('unknown and released Session questions cancel without reaching a destination', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);

  const requestPermission = vi.fn<AcpSessionDestination['requestPermission']>(
    createResourceDestination().requestPermission,
  );

  const createElicitation = vi.fn<AcpSessionDestination['createElicitation']>(
    createResourceDestination().createElicitation,
  );

  const lease = await resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      requestPermission,
      createElicitation,
    }),
  );

  await lease.close();
  const process = requireScriptedProcessAt(peer.processes);

  for (const sessionId of ['unknown', lease.sessionId]) {
    expect(
      await process.connection.client.request('session/request_permission', {
        sessionId,
        toolCall: { toolCallId: 'question' },
        options: [],
      }),
    ).toEqual({ outcome: { outcome: 'cancelled' } });
    expect(
      await process.connection.client.request('elicitation/create', {
        sessionId,
        mode: 'form',
        message: 'Question',
        requestedSchema: { type: 'object', properties: {} },
      }),
    ).toEqual({ action: 'cancel' });
  }

  expect(requestPermission).not.toHaveBeenCalled();
  expect(createElicitation).not.toHaveBeenCalled();
  await resources.shutdown();
});
