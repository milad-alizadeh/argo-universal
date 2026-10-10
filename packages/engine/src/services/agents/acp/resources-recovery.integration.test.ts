import type { ResumeSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
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
it('a failed process exiting late leaves its replacement shared', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources(peer);
  await resources.open(createResourceOpening());
  const old = requireScriptedProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const recovery = resources.open(createResourceOpening());
  old.exited.resolve();
  await recovery;
  await resources.open(createResourceOpening());
  expect(peer.processes).toHaveLength(2);
});

it('shutdown waits for a failed process to exit', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources(peer);
  await resources.open(createResourceOpening());
  const old = requireScriptedProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const shutdown = resources.shutdown();
  const waiting = new Promise((resolve) => setTimeout(resolve, 20, 'waiting'));
  expect(await Promise.race([shutdown, waiting])).toBe('waiting');
  old.exited.resolve();
  await expect(shutdown).resolves.toBeUndefined();
});

it('concurrent recovery shares one replacement initialization', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const first = await resources.open(createResourceOpening());
  const second = await resources.open(createResourceOpening());
  const old = requireScriptedProcessAt(peer.processes);
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
  const resumed: ResumeSessionRequest[] = [];
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
    responses: { 'session/resume': [{ result: {}, requests: resumed }] },
  });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  const old = requireScriptedProcessAt(peer.processes);
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
  expect(resumed.map(({ sessionId }) => sessionId)).toEqual([lease.sessionId]);
});

it('an old process that never exits blocks recovery with a concrete failure', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
  });
  const resources = createAcpResources({ ...peer, releaseTimeoutMs: 20 });
  const lease = await resources.open(createResourceOpening());
  const old = requireScriptedProcessAt(peer.processes);
  old.disconnect();
  await vi.waitFor(() => expect(old.terminations).toBe(1));
  const recovery = resources.open(resumeOpening(lease.sessionId));
  void recovery.catch(() => {});
  const replacement = await vi.waitFor(() =>
    requireScriptedProcessAt(peer.processes, 1),
  );
  await vi.waitFor(() => expect(replacement.terminations).toBe(1));
  replacement.exited.resolve();
  await expect(recovery).rejects.toThrow(
    'The previous Agent process did not exit',
  );
});
