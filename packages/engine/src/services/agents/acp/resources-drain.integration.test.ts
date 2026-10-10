import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceOpening,
  createResourceDestination,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { pauseAcpResponses } from '#mocks/scripted-write-pressure';
import { createAcpResources } from '../index';

it('closure waits for an accepted responder to finish writing under stream pressure', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
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
    createResourceOpening({
      ...createResourceDestination(),
      requestPermission: () => {
        requested = true;
        return pending.promise;
      },
    }),
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
    .then(() => answers[0])
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
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
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
  if (!paused) throw new Error('Missing pressured stream');
  onTestFinished(paused.resume);
  const process = requireScriptedProcessAt(peer.processes);
  const answers: RequestPermissionResponse[] = [];
  const permission = process
    .play(
      [{ type: 'permission', request: acpPermission, responses: answers }],
      lease.sessionId,
    )
    .then(() => answers[0])
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
