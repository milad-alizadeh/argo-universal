import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
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

it('final release stays pending after SDK closure until process exit is observed', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  let released = false;
  const closing = lease.close().then(() => {
    released = true;
  });
  await vi.waitFor(() => expect(peer.processes[0]?.terminations).toBe(1));
  expect(released).toBe(false);
  peer.processes[0]?.exited.resolve();
  await closing;
  await lease.released;
});

it('a rejected close retains ownership without interrupting a live sibling', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    sessionIds: ['1', '2'],
    responses: {
      'session/close': [
        { sessionId: '1', error: 'close refused' },
        { result: {} },
      ],
    },
  });
  const resources = createAcpResources(peer);
  const broken = await resources.open(createResourceOpening());
  const updates: ReturnType<typeof createResourceUpdate>[] = [];
  const survivor = await resources.open(
    createResourceOpening(createResourceDestination(updates)),
  );
  await expect(broken.close()).rejects.toThrow('Internal error');
  let released = false;
  const release = broken.released.then(() => {
    released = true;
  });
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'unavailable',
  );
  const process = requireScriptedProcessAt(peer.processes);
  await process.play(
    [{ type: 'update', update: createResourceUpdate('2').update }],
    '2',
  );
  await vi.waitFor(() => expect(updates).toEqual([createResourceUpdate('2')]));
  expect(released).toBe(false);
  expect(process.terminations).toBe(0);
  await survivor.close();
  await release;
  expect(process.terminations).toBe(1);
});

it('closure settles pending inbound requests before releasing their destination', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const answer = Promise.withResolvers<never>();
  let requested = false;
  const lease = await resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      requestPermission: () => {
        requested = true;
        return answer.promise;
      },
    }),
  );
  const answers: RequestPermissionResponse[] = [];
  const permission = requireScriptedProcessAt(peer.processes)
    .play(
      [{ type: 'permission', request: acpPermission, responses: answers }],
      lease.sessionId,
    )
    .then(() => answers[0]);
  await vi.waitFor(() => expect(requested).toBe(true));
  await lease.close();
  expect(await permission).toEqual({ outcome: { outcome: 'cancelled' } });
});

it('a failed final close attempts termination and retains release until observed exit', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
    responses: { 'session/close': [{ error: 'close refused' }] },
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  await expect(lease.close()).rejects.toThrow('Internal error');
  const process = requireScriptedProcessAt(peer.processes);
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  let released = false;
  const release = lease.released.then(() => {
    released = true;
  });
  expect(released).toBe(false);
  process.exited.resolve();
  await release;
});
