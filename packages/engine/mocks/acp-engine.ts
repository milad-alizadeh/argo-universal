import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgentMetadata } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished } from 'vitest';
import type { EngineInput } from '../src/engine/machine';
import type { AcpResourceInput } from '../src/services/agents';
import { resourceLaunch } from './acp-resource';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { createScriptedAgentProcess } from './scripted-agent';

export const emptySessionInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' as const },
  configOptions: [],
  prompt: [],
};
export const startAcpEngine = async (
  scenario: ScriptedScenario & { autoExit?: boolean } & Partial<
      Pick<EngineInput, 'fetchAgents'>
    > &
    Pick<AcpResourceInput, 'closeTimeoutMs' | 'releaseTimeoutMs'> = {
    steps: [],
  },
  createId: () => string = randomUUID,
  agentId = 'mock',
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    agent: ReturnType<typeof createScriptedAgentProcess>;
  }
> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));
  initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  const agent = createScriptedAgentProcess(scenario);
  const host = await startEngineTestHost({
    database: storage.database,
    createId,
    ...(scenario.fetchAgents ? { fetchAgents: scenario.fetchAgents } : {}),
    adapters: [{ ...createAgentMetadata(), agent: agentId }],
    acp: {
      ...agent,
      closeTimeoutMs: scenario.closeTimeoutMs,
      releaseTimeoutMs: scenario.releaseTimeoutMs,
    },
    resolveAgentLaunch: async (input) => ({
      ...resourceLaunch,
      agentId: input.agent,
      projectId: input.projectId,
      cwd: input.projectPath,
    }),
  });
  onTestFinished(async () => {
    for (const process of agent.processes) process.exited.resolve();
    await host.stop();
    storage.remove();
    rmSync(directory, { recursive: true, force: true });
  });
  return { ...host, agent };
};
