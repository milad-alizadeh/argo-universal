import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
  createResourcePeer,
  createResourceUpdate,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources, type AcpOpenInput } from '../index';

const resumeOpening = (
  sessionId: string,
  destination = createResourceDestination(),
): AcpOpenInput => ({
  ...createResourceOpening(destination),
  opening: {
    method: 'session/resume',
    params: { sessionId, cwd: '/checkout', mcpServers: [] },
  },
});
const failureRecorder = (
  updates: SessionNotification[] = [],
): {
  failures: unknown[];
  destination: ReturnType<typeof createResourceDestination>;
} => {
  const failures: unknown[] = [];
  return {
    failures,
    destination: {
      ...createResourceDestination(updates),
      failed: (error) => {
        failures.push(error);
      },
    },
  };
};

it('a failed shared connection informs each attached Session once and fences its late callbacks', async () => {
  const peer = createResourcePeer({ autoExit: false });
  const resources = createAcpResources(peer);
  const firstUpdates: SessionNotification[] = [];
  const first = failureRecorder(firstUpdates);
  const second = failureRecorder();
  const firstLease = await resources.open(
    createResourceOpening(first.destination),
  );
  await resources.open(createResourceOpening(second.destination));
  const old = requireResourceProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  await old.connection.client
    .notify('session/update', createResourceUpdate(firstLease.sessionId))
    .catch(() => {});
  expect([first.failures.length, second.failures.length]).toEqual([1, 1]);
  expect(firstUpdates).toEqual([]);
});

it('concurrent recovery shares one replacement initialization', async () => {
  const peer = createResourcePeer();
  const resources = createAcpResources(peer);
  const first = await resources.open(createResourceOpening());
  const second = await resources.open(createResourceOpening());
  const old = requireResourceProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const recovered = await Promise.all([
    resources.open(resumeOpening(first.sessionId)),
    resources.open(resumeOpening(second.sessionId)),
  ]);
  expect(recovered.map((lease) => lease.sessionId)).toEqual([
    first.sessionId,
    second.sessionId,
  ]);
  expect(peer.processes).toHaveLength(2);
});

it('resuming in the affected Checkout waits for the old process to exit', async () => {
  const resumed: string[] = [];
  const peer = createResourcePeer({
    autoExit: false,
    resumeSession: ({ params }) => {
      resumed.push(params.sessionId);
      return {};
    },
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  const old = requireResourceProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const recovery = resources.open(resumeOpening(lease.sessionId));
  await vi.waitFor(() => expect(peer.processes).toHaveLength(2));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(resumed).toEqual([]);
  old.exited.resolve();
  await expect(recovery).resolves.toMatchObject({
    sessionId: lease.sessionId,
  });
  expect(resumed).toEqual([lease.sessionId]);
});

it('an old process that never exits blocks recovery with a concrete failure', async () => {
  const peer = createResourcePeer({ autoExit: false });
  const resources = createAcpResources({ ...peer, releaseTimeoutMs: 20 });
  const lease = await resources.open(createResourceOpening());
  const old = requireResourceProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const recovery = resources.open(resumeOpening(lease.sessionId));
  void recovery.catch(() => {});
  const replacement = await vi.waitFor(() =>
    requireResourceProcessAt(peer.processes, 1),
  );
  await vi.waitFor(() => expect(replacement.terminations).toBe(1));
  replacement.exited.resolve();
  await expect(recovery).rejects.toThrow(
    'The previous Agent process did not exit',
  );
});
