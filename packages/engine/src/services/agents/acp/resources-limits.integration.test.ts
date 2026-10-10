import { expect, it, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourcePeer,
  createResourceOpening,
  createResourceDestination,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('owned callback overflow reports resource failure and cannot release without process exit', async () => {
  const peer = createResourcePeer({ autoExit: false });
  const resources = createAcpResources(peer);
  const failures: unknown[] = [];
  const pending = Promise.withResolvers<never>();
  const lease = await resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
      requestPermission: () => pending.promise,
    }),
  );
  const process = requireResourceProcessAt(peer.processes);
  const answers = Array.from({ length: 17 }, () =>
    process.connection.client
      .request('session/request_permission', {
        ...acpPermission,
        sessionId: lease.sessionId,
      })
      .catch((error: unknown): unknown => error),
  );
  await vi.waitFor(() =>
    expect(failures).toContainEqual(
      new Error('ACP pending request limit reached'),
    ),
  );
  await expect(lease.close()).rejects.toThrow('ACP connection closed');
  let released = false;
  const release = lease.released.then(() => {
    released = true;
  });
  expect(released).toBe(false);
  expect(process.terminations).toBe(1);
  process.exited.resolve();
  await release;
  expect(await Promise.all(answers)).toHaveLength(17);
});
