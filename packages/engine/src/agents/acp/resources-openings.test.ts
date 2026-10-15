import type { AnyMessage } from '@agentclientprotocol/sdk';
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
import { createAcpResources } from './index';

const updateMessage = (sessionId: string): AnyMessage => ({
  jsonrpc: '2.0',
  method: 'session/update',
  params: createResourceUpdate(sessionId),
});

type OpeningRequestId = Awaited<
  ReturnType<ReturnType<typeof requireScriptedProcessAt>['readRequest']>
>['id'];

const holdTwoOpenings = async (): Promise<{
  resources: ReturnType<typeof createAcpResources>;
  process: ReturnType<typeof requireScriptedProcessAt>;
  first: ReturnType<ReturnType<typeof createAcpResources>['open']>;
  second: ReturnType<ReturnType<typeof createAcpResources>['open']>;
  firstUpdates: ReturnType<typeof createResourceUpdate>[];
  secondUpdates: ReturnType<typeof createResourceUpdate>[];
  firstId: OpeningRequestId;
  secondId: OpeningRequestId;
}> => {
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: { 'session/new': [{ steps: [{ type: 'hold' }] }] },
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

  void first.catch(() => {});
  void second.catch(() => {});

  const process = await vi.waitFor(() =>
    requireScriptedProcessAt(peer.processes),
  );

  await process.readRequest();
  const firstId = (await process.readRequest()).id;
  const secondId = (await process.readRequest()).id;

  return {
    resources,
    process,
    first,
    second,
    firstUpdates,
    secondUpdates,
    firstId,
    secondId,
  };
};

it('an Agent request that reuses a pending opening id leaves that opening registered', async () => {
  const opened = await holdTwoOpenings();
  await opened.process.send([
    { jsonrpc: '2.0', id: opened.firstId, result: { sessionId: 'first' } },
    {
      jsonrpc: '2.0',
      id: opened.secondId,
      method: 'session/request_permission',
      params: {
        sessionId: 'first',
        toolCall: { toolCallId: 'question' },
        options: [],
      },
    },
    { jsonrpc: '2.0', id: opened.secondId, result: { sessionId: 'second' } },
    updateMessage('second'),
  ]);
  await opened.first;
  await opened.second;
  expect(opened.secondUpdates).toEqual([createResourceUpdate('second')]);
  await opened.resources.shutdown();
});

it('a malformed opening response fails only its own open', async () => {
  const opened = await holdTwoOpenings();
  await opened.process.send([
    { jsonrpc: '2.0', id: opened.firstId, result: { sessionId: 'first' } },
    { jsonrpc: '2.0', id: opened.secondId, result: {} },
    updateMessage('first'),
  ]);
  await expect(opened.second).rejects.toThrow('Invalid ACP NewSessionResponse');
  await opened.first;
  await vi.waitFor(() =>
    expect(opened.firstUpdates).toEqual([createResourceUpdate('first')]),
  );
  await opened.resources.shutdown();
});

it('an opening that repeats an open Session id fails without taking its updates', async () => {
  const opened = await holdTwoOpenings();
  await opened.process.send([
    { jsonrpc: '2.0', id: opened.firstId, result: { sessionId: 'same' } },
    { jsonrpc: '2.0', id: opened.secondId, result: { sessionId: 'same' } },
    updateMessage('same'),
  ]);
  await expect(opened.second).rejects.toThrow('could not be opened');
  await opened.first;
  await vi.waitFor(() =>
    expect(opened.firstUpdates).toEqual([createResourceUpdate('same')]),
  );
  expect(opened.secondUpdates).toEqual([]);
  await opened.resources.shutdown();
});
