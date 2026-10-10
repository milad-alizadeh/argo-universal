import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourcePeer,
  createResourceOpening,
  createResourceDestination,
  createResourceUpdate,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

const agentScript = fileURLToPath(
  new URL('../../../../mocks/acp-process.mts', import.meta.url),
);

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

it('more than 64 early updates fail the opening resource instead of growing the buffer', async () => {
  const failures: unknown[] = [];
  const peer = createResourcePeer({
    newSession: async ({ client }) => {
      for (let index = 0; index < 65; index += 1)
        await client.notify('session/update', createResourceUpdate('early'));
      return { sessionId: 'early' };
    },
  });
  const resources = createAcpResources(peer);
  const opening = resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
    }),
  );
  await expect(opening).rejects.toBeDefined();
  expect(failures).toContainEqual(
    new Error('ACP early update buffer limit reached'),
  );
  await resources.shutdown();
});

it('a resource refuses a 65th concurrent opening', async () => {
  const gate = Promise.withResolvers<void>();
  let opened = 0;
  const peer = createResourcePeer({
    newSession: async () => {
      await gate.promise;
      opened += 1;
      return { sessionId: `owned-${opened}` };
    },
  });
  const resources = createAcpResources(peer);
  const openings = Array.from({ length: 64 }, () =>
    resources.open(createResourceOpening()),
  );
  await vi.waitFor(() => expect(peer.processes).toHaveLength(1));
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'ACP resource is unavailable',
  );
  gate.resolve();
  const leases = await Promise.all(openings);
  await Promise.all(leases.map((lease) => lease.close()));
  await resources.shutdown();
});

it('an Agent frame over the 32 MiB limit fails its connection with the SDK limit error', async () => {
  const failures: unknown[] = [];
  const base = createResourceOpening({
    ...createResourceDestination(),
    failed: (error) => {
      failures.push(error);
    },
  });
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      executable: process.execPath,
      cwd: process.cwd(),
      args: [agentScript],
    },
  });
  await expect(
    lease.agent.request('session/prompt', {
      sessionId: lease.sessionId,
      prompt: [{ type: 'text', text: 'Oversized' }],
    }),
  ).rejects.toBeDefined();
  await vi.waitFor(() =>
    expect(failures).toContainEqual(
      expect.objectContaining({
        name: 'MessageTooLargeError',
        maxMessageBytes: 32 * 1024 * 1024,
      }),
    ),
  );
});
