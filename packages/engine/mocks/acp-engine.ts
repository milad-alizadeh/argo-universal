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

type AcpScenario = ScriptedScenario & { autoExit?: boolean } & Partial<
    Pick<
      EngineInput,
      'fetchAgents' | 'caffeinate' | 'operationWaitClock' | 'commandsWaitMs'
    >
  > &
  Pick<
    AcpResourceInput,
    'closeTimeoutMs' | 'launchLoginTerminal' | 'launchProcess' | 'sessionAccess'
  > & {
    // Writes first-party fixture Plugins into the Engine's home before it starts.
    installPlugins?: (home: string) => Promise<void>;
    // Starts over the storage a stopped Engine left (its `home`), as an app restart does.
    restartOver?: string;
  };

type AgentIds = string | readonly string[];

type AcpHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
};

export const startAcpEngine = (
  scenario: AcpScenario = { steps: [] },
  createId: () => string = randomUUID,
  agentIds?: AgentIds,
): Promise<AcpHost> => launchAcpFixture(scenario, { createId, agentIds });

const launchAcpFixture = async (
  scenario: AcpScenario,
  identity: { createId: () => string; agentIds?: AgentIds },
): Promise<AcpHost> => {
  const { directory, ...opened } = await setupAcpStorage(scenario);
  const agent = createScriptedAgentProcess(scenario);
  const options = engineOptions(scenario, { ...opened, agent, ...identity });

  const host = await startEngineTestHost(options);

  onTestFinished(() =>
    stopAcpFixture({ host, agent, storage: opened.storage, directory }),
  );

  return { ...host, agent };
};

type TestStorage = ReturnType<typeof openTestDatabase>;

type OpenedStorage = {
  // None when the Engine starts over a stopped Engine's storage.
  storage: TestStorage | undefined;
  home: string;
};

type AcpStorage = OpenedStorage & { directory: string };

async function openFixtureStorage(
  scenario: AcpScenario,
  directory: string,
): Promise<OpenedStorage> {
  if (scenario.restartOver)
    return { storage: undefined, home: scenario.restartOver };
  await initTestRepository(directory);
  const storage = openTestDatabase({}, directory);

  return { storage, home: storage.directory };
}

const setupAcpStorage = async (scenario: AcpScenario): Promise<AcpStorage> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));
  const opened = await openFixtureStorage(scenario, directory);
  await scenario.installPlugins?.(opened.home);

  return { ...opened, directory };
};

type Fixture = OpenedStorage & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
  createId: () => string;
  agentIds?: AgentIds;
};

// Most tests have Agents that send no Slash command list; they must not wait for one.
const scenarioOptions = (scenario: AcpScenario): EngineTestOptions => ({
  caffeinate: scenario.caffeinate,
  operationWaitClock: scenario.operationWaitClock,
  commandsWaitMs: scenario.commandsWaitMs ?? 0,
});

const fixtureAgents = (
  agentIds: AgentIds = 'mock',
): EngineTestOptions['fixtureAgents'] =>
  [agentIds].flat().map(createAgentMetadata);

const engineOptions = (
  scenario: AcpScenario,
  fixture: Fixture,
): EngineTestOptions => {
  const options: EngineTestOptions = {
    ...scenarioOptions(scenario),
    database: fixture.storage?.database,
    home: fixture.home,
    createId: fixture.createId,
    fixtureAgents: fixtureAgents(fixture.agentIds),
    acp: acpOptions(scenario, fixture.agent),
  };

  if (scenario.fetchAgents) options.fetchAgents = scenario.fetchAgents;

  return options;
};

const acpOptions = (
  scenario: AcpScenario,
  agent: Fixture['agent'],
): NonNullable<EngineTestOptions['acp']> => ({
  ...agent,
  launchProcess: scenario.launchProcess ?? agent.launchProcess,
  launchLoginTerminal: scenario.launchLoginTerminal,
  closeTimeoutMs: scenario.closeTimeoutMs,
  sessionAccess: scenario.sessionAccess,
});

type FixtureCleanup = Pick<Fixture, 'agent' | 'storage'> & {
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  directory: string;
};

const stopAcpFixture = async ({
  host,
  agent,
  storage,
  directory,
}: FixtureCleanup): Promise<void> => {
  for (const process of agent.processes) process.exited.resolve();
  await host.stop();
  storage?.remove();
  rmSync(directory, { recursive: true, force: true });
};
