import { expect, it, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourcePeer,
  createResourceDestination,
  createResourceOpening,
  createResourceUpdate,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('final release stays pending after SDK closure until process exit is observed', async () => {
  const peer = createResourcePeer({ autoExit: false });
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
  let nextIdentity = 0;
  const peer = createResourcePeer({
    newSession: () => ({ sessionId: String(++nextIdentity) }),
    closeSession: ({ params }) => {
      if (params.sessionId === '1') throw new Error('close refused');
      return {};
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
  const process = requireResourceProcessAt(peer.processes);
  await process.connection.client.notify(
    'session/update',
    createResourceUpdate('2'),
  );
  await vi.waitFor(() => expect(updates).toEqual([createResourceUpdate('2')]));
  expect(released).toBe(false);
  expect(process.terminations).toBe(0);
  await survivor.close();
  await release;
  expect(process.terminations).toBe(1);
});

it('closure settles pending inbound requests before releasing their destination', async () => {
  const peer = createResourcePeer();
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
  const permission = peer.processes[0]?.connection.client.request(
    'session/request_permission',
    { ...acpPermission, sessionId: lease.sessionId },
  );
  await vi.waitFor(() => expect(requested).toBe(true));
  await lease.close();
  expect(await permission).toEqual({ outcome: { outcome: 'cancelled' } });
});

it('a failed final close attempts termination and retains release until observed exit', async () => {
  const peer = createResourcePeer({
    autoExit: false,
    closeSession: () => {
      throw new Error('close refused');
    },
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  await expect(lease.close()).rejects.toThrow('Internal error');
  const process = requireResourceProcessAt(peer.processes);
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  let released = false;
  const release = lease.released.then(() => {
    released = true;
  });
  expect(released).toBe(false);
  process.exited.resolve();
  await release;
});
