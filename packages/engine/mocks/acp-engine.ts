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
    Pick<EngineInput, 'fetchAgents' | 'caffeinate' | 'operationWaitClock'>
  > &
  Pick<
    AcpResourceInput,
    'closeTimeoutMs' | 'launchLoginTerminal' | 'launchProcess' | 'sessionAccess'
  > & {
    // Writes first-party fixture Plugins into the Engine's home before it starts.
    installPlugins?: (home: string) => Promise<void>;
  };

type AcpHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
};

export const startAcpEngine = (
  scenario: AcpScenario = { steps: [] },
  createId: () => string = randomUUID,
  agentId?: string,
): Promise<AcpHost> => launchAcpFixture(scenario, { createId, agentId });

const launchAcpFixture = async (
  scenario: AcpScenario,
  identity: { createId: () => string; agentId?: string },
): Promise<AcpHost> => {
  const { storage, directory } = await setupAcpStorage(scenario);
  const agent = createScriptedAgentProcess(scenario);
  const options = engineOptions(scenario, { storage, agent, ...identity });

  const host = await startEngineTestHost(options);

  onTestFinished(() => stopAcpFixture({ host, agent, storage, directory }));

  return { ...host, agent };
};

type AcpStorage = {
  storage: ReturnType<typeof openTestDatabase>;
  directory: string;
};

const setupAcpStorage = async (scenario: AcpScenario): Promise<AcpStorage> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));
  await initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  await scenario.installPlugins?.(storage.directory);

  return { storage, directory };
};

type Fixture = {
  storage: ReturnType<typeof openTestDatabase>;
  agent: ReturnType<typeof createScriptedAgentProcess>;
  createId: () => string;
  agentId?: string;
};

const engineOptions = (
  scenario: AcpScenario,
  fixture: Fixture,
): EngineTestOptions => {
  const options: EngineTestOptions = {
    database: fixture.storage.database,
    createId: fixture.createId,
    caffeinate: scenario.caffeinate,
    operationWaitClock: scenario.operationWaitClock,
    fixtureAgents: [createAgentMetadata(fixture.agentId ?? 'mock')],
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
  storage.remove();
  rmSync(directory, { recursive: true, force: true });
};
