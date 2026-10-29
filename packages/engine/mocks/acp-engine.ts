import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgentMetadata } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished } from 'vitest';
import type { AcpResourceInput } from '../src/agents';
import type { EngineInput } from '../src/engine/machine';
import { openTestDatabase } from './database';
import { type EngineTestOptions, startEngineTestHost } from './engine';
import { createScriptedAgentProcess } from './scripted-agent';

export const emptySessionInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' as const },
  configOptions: [],
  prompt: [],
};

async function openRepositoryStorage(
  directory: string,
): Promise<ReturnType<typeof openTestDatabase>> {
  await initTestRepository(directory);

  return openTestDatabase({}, directory);
}

export const startAcpEngine = async (
  scenario: ScriptedScenario & { autoExit?: boolean } & Partial<
      Pick<
        EngineInput,
        | 'fetchAgents'
        | 'caffeinate'
        | 'operationWaitClock'
        | 'slashCommandsWaitMs'
      >
    > &
    Pick<
      AcpResourceInput,
      | 'closeTimeoutMs'
      | 'launchLoginTerminal'
      | 'launchProcess'
      | 'sessionAccess'
    > & {
      // Writes first-party fixture Plugins into the Engine's home before it starts.
      installPlugins?: (home: string) => Promise<void>;
      // Starts over the storage a stopped Engine left (its `home`), as an app restart does.
      restartOver?: string;
    } = {
    steps: [],
  },
  createId: () => string = randomUUID,
  agentIds: string | readonly string[] = 'mock',
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    agent: ReturnType<typeof createScriptedAgentProcess>;
  }
> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));

  const storage = scenario.restartOver
    ? undefined
    : await openRepositoryStorage(directory);

  await scenario.installPlugins?.(
    storage?.directory ?? scenario.restartOver ?? directory,
  );
  const agent = createScriptedAgentProcess(scenario);

  const options: EngineTestOptions = {
    database: storage?.database,
    home: scenario.restartOver,
    createId,
    caffeinate: scenario.caffeinate,
    operationWaitClock: scenario.operationWaitClock,
    // Most tests have Agents that send no list; they must not wait for one.
    slashCommandsWaitMs: scenario.slashCommandsWaitMs ?? 0,
    fixtureAgents: [agentIds].flat().map(createAgentMetadata),
    acp: {
      ...agent,
      launchProcess: scenario.launchProcess ?? agent.launchProcess,
      launchLoginTerminal: scenario.launchLoginTerminal,
      closeTimeoutMs: scenario.closeTimeoutMs,
      sessionAccess: scenario.sessionAccess,
    },
  };

  if (scenario.fetchAgents) options.fetchAgents = scenario.fetchAgents;
  const host = await startEngineTestHost(options);

  onTestFinished(async () => {
    for (const process of agent.processes) process.exited.resolve();
    await host.stop();
    storage?.remove();
    rmSync(directory, { recursive: true, force: true });
  });

  return { ...host, agent };
};
