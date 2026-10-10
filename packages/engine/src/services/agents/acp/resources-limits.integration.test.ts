import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceOpening,
  createResourceDestination,
  createResourceUpdate,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it('owned callback overflow reports resource failure and cannot release without process exit', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
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
  const process = requireScriptedProcessAt(peer.processes);
  const answers = Array.from({ length: 17 }, () =>
    process
      .play([{ type: 'permission', request: acpPermission }], lease.sessionId)
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
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/new': [
        {
          result: { sessionId: 'early' },
          steps: Array.from({ length: 65 }, () => ({
            type: 'update' as const,
            sessionId: 'early',
            update: createResourceUpdate('early').update,
          })),
        },
      ],
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
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: { 'session/new': [{ waitFor: gate.promise }] },
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
  const agent = createScriptedAgentProcess({
    steps: [{ type: 'raw', frame: 'x'.repeat(32 * 1024 * 1024 + 1) }],
  });
  const resources = createAcpResources(agent);
  onTestFinished(() => resources.shutdown());
  const lease = await resources.open(base);
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
