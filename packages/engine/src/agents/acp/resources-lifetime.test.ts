import type {
  NewSessionRequest,
  NewSessionResponse,
} from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceOpening,
  resourceInitialization,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from './index';

it('terminates an Agent whose transport fails while its process stays alive', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  onTestFinished(() => resources.shutdown());
  await resources.open(createResourceOpening());
  const process = requireScriptedProcessAt(peer.processes);
  process.disconnect();
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  await resources.open(createResourceOpening());
  expect(peer.processes).toHaveLength(2);
});

it('shutdown terminates an Agent that never answers initialize', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      initialize: [
        { result: new Promise<typeof resourceInitialization>(() => {}) },
      ],
    },
  });

  const resources = createAcpResources(peer);

  const opening = resources
    .open(createResourceOpening())
    .catch((cause: unknown) =>
      cause instanceof Error ? cause : new Error(String(cause)),
    );

  const process = await vi.waitFor(() =>
    requireScriptedProcessAt(peer.processes),
  );

  expect((await process.readRequest()).method).toBe('initialize');
  const stopping = resources.shutdown();
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  await stopping;
  expect(await opening).toBeInstanceOf(Error);
});

it.each([false, true])(
  'dropped connections retire after their last lease (already idle: %s)',
  async (idle) => {
    const peer = createScriptedAgentProcess({ steps: [] });
    const resources = createAcpResources(peer);
    onTestFinished(() => resources.shutdown());
    const base = createResourceOpening();
    const lease = await resources.open(base);
    const process = requireScriptedProcessAt(peer.processes);

    if (idle) await lease.close();
    resources.dropAgentConnections(base.launch.agentId);

    if (!idle) {
      await lease.close();
    }

    await vi.waitFor(() => expect(process.terminations).toBe(1));
    await resources.open(base);
    expect(peer.processes).toHaveLength(2);
  },
);

it('shutdown owns an Agent whose launch completes after stopping begins', async () => {
  const launch = Promise.withResolvers<void>();
  const peer = createScriptedAgentProcess({ steps: [] });

  const resources = createAcpResources({
    launchProcess: async (input) => {
      await launch.promise;

      return peer.launchProcess(input);
    },
  });

  const opening = resources
    .open(createResourceOpening())
    .catch((cause: unknown) =>
      cause instanceof Error ? cause : new Error(String(cause)),
    );

  const stopping = resources.shutdown();
  launch.resolve();
  await stopping;
  expect(requireScriptedProcessAt(peer.processes).terminations).toBe(1);
  expect(await opening).toBeInstanceOf(Error);
});

it('a dropped withdrawn opening retains ownership until its late rejected response', async () => {
  const response = Promise.withResolvers<NewSessionResponse>();
  const requests: NewSessionRequest[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    responses: { 'session/new': [{ result: response.promise, requests }] },
  });

  const resources = createAcpResources(peer);
  onTestFinished(() => resources.shutdown());
  const base = createResourceOpening();
  const controller = new AbortController();

  const opening = resources
    .open({ ...base, signal: controller.signal })
    .catch((cause: unknown) =>
      cause instanceof Error ? cause : new Error(String(cause)),
    );

  await vi.waitFor(() => expect(requests).toHaveLength(1));
  resources.dropAgentConnections(base.launch.agentId);
  controller.abort();
  await opening;
  const process = requireScriptedProcessAt(peer.processes);
  expect(process.terminations).toBe(0);
  response.reject(new Error('Session refused'));
  await vi.waitFor(() => expect(process.terminations).toBe(1));
});
