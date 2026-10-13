import type { SessionNotification } from '@agentclientprotocol/sdk';
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

it('a failed shared connection informs each attached Session once', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources(peer);
  const first = failureRecorder();
  const second = failureRecorder();
  await resources.open(createResourceOpening(first.destination));
  await resources.open(createResourceOpening(second.destination));
  const old = requireScriptedProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  expect([first.failures.length, second.failures.length]).toEqual([1, 1]);
});

it('a failed connection fences its late Session updates', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources(peer);
  const updates: SessionNotification[] = [];
  const lease = await resources.open(
    createResourceOpening(failureRecorder(updates).destination),
  );
  const old = requireScriptedProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  await old
    .play(
      [
        {
          type: 'update',
          update: createResourceUpdate(lease.sessionId).update,
        },
      ],
      lease.sessionId,
    )
    .catch(() => {});
  expect(updates).toEqual([]);
});
