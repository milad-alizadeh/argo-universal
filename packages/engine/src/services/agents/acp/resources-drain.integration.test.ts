import { expect, it, onTestFinished, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourcePeer,
  resourceOpening,
  resourceDestination,
  resourceProcessAt,
} from '#mocks/acp-resource';
import { pauseAcpResponses } from '#mocks/acp-write-pressure';
import { createAcpResources } from '../index';

it('closure waits for an accepted responder to finish writing under stream pressure', async () => {
  const peer = createResourcePeer();
  let paused: ReturnType<typeof pauseAcpResponses> | undefined;
  const resources = createAcpResources({
    launchProcess: async (launch) => {
      const process = await peer.launchProcess(launch);
      paused = pauseAcpResponses(process.stream);
      return { ...process, stream: paused.stream };
    },
  });
  const pending = Promise.withResolvers<never>();
  let requested = false;
  const lease = await resources.open(
    resourceOpening({
      ...resourceDestination(),
      requestPermission: () => {
        requested = true;
        return pending.promise;
      },
    }),
  );
  if (!paused) throw new Error('Missing pressured stream');
  onTestFinished(paused.resume);
  const process = resourceProcessAt(peer.processes);
  const permission = process.connection.client
    .request('session/request_permission', {
      ...acpPermission,
      sessionId: lease.sessionId,
    })
    .catch((error: unknown): unknown => error);
  await vi.waitFor(() => expect(requested).toBe(true));
  const closing = lease.close();
  await paused.entered;
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(process.terminations).toBe(0);
  paused.resume();
  await closing;
  expect(await permission).toEqual({ outcome: { outcome: 'cancelled' } });
});

it('a rejected accepted response write is surfaced and release still requires process exit', async () => {
  const peer = createResourcePeer({ autoExit: false });
  let paused: ReturnType<typeof pauseAcpResponses> | undefined;
  const resources = createAcpResources({
    launchProcess: async (launch) => {
      const process = await peer.launchProcess(launch);
      paused = pauseAcpResponses(process.stream);
      return { ...process, stream: paused.stream };
    },
  });
  const pending = Promise.withResolvers<never>();
  const failures: unknown[] = [];
  let requested = false;
  const lease = await resources.open(
    resourceOpening({
      ...resourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
      requestPermission: () => {
        requested = true;
        return pending.promise;
      },
    }),
  );
  if (!paused) throw new Error('Missing pressured stream');
  onTestFinished(paused.resume);
  const process = resourceProcessAt(peer.processes);
  const permission = process.connection.client
    .request('session/request_permission', {
      ...acpPermission,
      sessionId: lease.sessionId,
    })
    .catch((error: unknown): unknown => error);
  await vi.waitFor(() => expect(requested).toBe(true));
  const closing = lease.close().catch((error: unknown): unknown => error);
  await paused.entered;
  const failure = new Error('response write refused');
  paused.reject(failure);
  expect(await closing).toBe(failure);
  expect(failures).toContain(failure);
  let released = false;
  const release = lease.released.then(() => {
    released = true;
  });
  expect(released).toBe(false);
  expect(process.terminations).toBe(1);
  process.exited.resolve();
  await release;
  expect(await permission).toBeInstanceOf(Error);
});
