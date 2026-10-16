import { expect, it, vi } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it('invalidating an Agent stops its process and the next open starts a fresh one', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const lease = await resources.open(createResourceOpening());
  await lease.close();
  resources.invalidateAgent('agent');
  await vi.waitFor(() =>
    expect(requireScriptedProcessAt(peer.processes).terminations).toBe(1),
  );
  await resources.open(createResourceOpening());
  expect(peer.processes).toHaveLength(2);
  await resources.shutdown();
});

it('invalidating idle Agents keeps a process with an open Session', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  await resources.open(createResourceOpening());
  resources.invalidateIdleAgents();
  await resources.open(createResourceOpening());
  expect(peer.processes).toHaveLength(1);
  expect(requireScriptedProcessAt(peer.processes).terminations).toBe(0);
  await resources.shutdown();
});
