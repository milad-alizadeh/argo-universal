import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceOpening,
  createResourceDestination,
  createResourceUpdate,
  observeAcpRelease,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { pauseAcpResponses } from '#mocks/scripted-write-pressure';
import { createAcpResources } from '../index';

it('the close deadline bounds a blocked accepted write and retains ownership while preserving siblings', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  let paused: ReturnType<typeof pauseAcpResponses> | undefined;
  const resources = createAcpResources({
    closeTimeoutMs: 50,
    launchProcess: async (launch) => {
      const process = await peer.launchProcess(launch);
      paused = pauseAcpResponses(process.stream);
      return { ...process, stream: paused.stream };
    },
  });
  const failures: unknown[] = [];
  const pending = Promise.withResolvers<never>();
  let requested = false;
  const lease = await resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
      requestPermission: () => {
        requested = true;
        return pending.promise;
      },
    }),
  );
  const updates: ReturnType<typeof createResourceUpdate>[] = [];
  const sibling = await resources.open(
    createResourceOpening(createResourceDestination(updates)),
  );
  if (!paused) throw new Error('Missing pressured stream');
  onTestFinished(paused.resume);
  const process = requireScriptedProcessAt(peer.processes);
  const answers: RequestPermissionResponse[] = [];
  const permission = process
    .play(
      [{ type: 'permission', request: acpPermission, responses: answers }],
      lease.sessionId,
    )
    .then(() => answers[0]);
  await vi.waitFor(() => expect(requested).toBe(true));
  const closing = lease.close().catch((error: unknown): unknown => error);
  await paused.entered;
  await vi.waitFor(() =>
    expect(failures).toContainEqual(
      new Error('ACP session close timed out; cleanup retained'),
    ),
  );
  expect(await closing).toEqual(
    new Error('ACP session close timed out; cleanup retained'),
  );
  const release = observeAcpRelease(lease);
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'unavailable',
  );
  await process.play(
    [
      {
        type: 'update',
        update: createResourceUpdate(sibling.sessionId).update,
      },
    ],
    sibling.sessionId,
  );
  await vi.waitFor(() =>
    expect(updates).toEqual([createResourceUpdate(sibling.sessionId)]),
  );
  expect({
    terminations: process.terminations,
    released: release.state.settled,
  }).toEqual({ terminations: 0, released: false });
  paused.resume();
  expect(await permission).toEqual({ outcome: { outcome: 'cancelled' } });
  const siblingClosing = sibling.close();
  await vi.waitFor(() =>
    expect({
      terminations: process.terminations,
      released: release.state.settled,
    }).toEqual({ terminations: 1, released: false }),
  );
  process.exited.resolve();
  await Promise.all([siblingClosing, release.promise]);
});
