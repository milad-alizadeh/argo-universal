import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockAdapter } from '@repo/mocks/agent';
import { onTestFinished } from 'vitest';
import { createResourcePeer, resourceLaunch } from './acp-resource';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { initTestRepository } from './git';

export const emptySessionInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' as const },
  configOptions: [],
  prompt: [],
};
export const startAcpEngine = async (
  peerInput: Parameters<typeof createResourcePeer>[0] = {},
  createId: () => string = randomUUID,
  agentId = 'mock',
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    peer: ReturnType<typeof createResourcePeer>;
  }
> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));
  initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  const peer = createResourcePeer(peerInput);
  const host = await startEngineTestHost({
    database: storage.database,
    createId,
    adapters: [{ ...createMockAdapter(), agent: agentId }],
    acp: peer,
    resolveAgentLaunch: async (input) => ({
      ...resourceLaunch,
      agentId: input.agent,
      projectId: input.projectId,
      cwd: input.projectPath,
    }),
  });
  onTestFinished(async () => {
    for (const process of peer.processes) process.exited.resolve();
    await host.stop();
    storage.remove();
    rmSync(directory, { recursive: true, force: true });
  });
  return { ...host, peer };
};
