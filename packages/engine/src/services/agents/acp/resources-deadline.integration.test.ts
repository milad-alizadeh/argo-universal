import { expect, it, onTestFinished, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourceOpening,
  createResourceDestination,
  requireResourceProcessAt,
  createResourceUpdate,
  observeAcpRelease,
} from '#mocks/acp-resource';
import { createPressuredResource } from '#mocks/acp-write-pressure';

it('the close deadline bounds a blocked accepted write and retains ownership while preserving siblings', async () => {
  let identity = 0;
  const { peer, resources, pressure } = createPressuredResource(
    {
      autoExit: false,
      newSession: () => ({ sessionId: String(++identity) }),
    },
    50,
  );
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
  const paused = pressure();
  onTestFinished(paused.resume);
  const process = requireResourceProcessAt(peer.processes);
  const permission = process.connection.client.request(
    'session/request_permission',
    {
      ...acpPermission,
      sessionId: lease.sessionId,
    },
  );
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
  await process.connection.client.notify(
    'session/update',
    createResourceUpdate(sibling.sessionId),
  );
  await vi.waitFor(() =>
    expect(updates).toEqual([createResourceUpdate(sibling.sessionId)]),
  );
  expect(process.terminations).toBe(0);
  expect(release.state.settled).toBe(false);
  paused.resume();
  expect(await permission).toEqual({ outcome: { outcome: 'cancelled' } });
  const siblingClosing = sibling.close();
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  expect(release.state.settled).toBe(false);
  process.exited.resolve();
  await Promise.all([siblingClosing, release.promise]);
});
