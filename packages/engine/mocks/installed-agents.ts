import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import {
  createAcpResources,
  createInstalledAgents,
  type InstalledAgent,
  type InstalledAgents,
  registryMachine,
} from '../src/agents';
import { writerMachine } from '../src/storage';
import { openTestDatabase } from './database';
import { type EngineTestOptions, startEngineTestHost } from './engine';
import { installationPorts } from './installation';
import { createScriptedAgentProcess } from './scripted-agent';

/*
 * The real Installed Agents module for an open Sessions test that never launches an Agent:
 * it answers from the test database, and its Registry actor is never started.
 * Creating that actor reads the stored Registry row once, so build it before counting reads.
 * A test that launches drives the Engine host instead.
 */
export const unlaunchedInstalledAgents = (
  database: Database,
  home: string,
): InstalledAgents =>
  createInstalledAgents({
    database,
    home,
    resources: createAcpResources(),
    ports: installationPorts,
    registry: fixtureRegistry(database),
  });

const fixtureRegistry = (
  database: Database,
): ReturnType<typeof createActor<typeof registryMachine>> =>
  createActor(registryMachine, {
    input: {
      database,
      writer: createActor(writerMachine, {
        input: { database, now: Date.now },
      }),
      now: Date.now,
    },
  });

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

export const installedAgentsOf = (host: EngineHost): InstalledAgents =>
  host.openSessions.getSnapshot().context.installedAgents;

// A Registry entry served at the Registry port, installed in a Project with a real folder; the scripted Agent answers ACP.
export const startLaunchHost = async (
  entry: ACPAgent,
  options: EngineTestOptions = {},
): Promise<{ host: EngineHost; projectPath: string }> => {
  const projectPath = mkdtempSync(join(tmpdir(), 'argo-installed-agent-'));
  const storage = openTestDatabase({}, projectPath);
  const { id } = entry;

  const host = await startEngineTestHost(
    launchOptions(entry, storage.database, options),
  );

  onTestFinished(() => removeLaunchHost(storage, projectPath));

  await host.caller.registry.refresh();
  await host.caller.agent.install({ id });

  return { host, projectPath };
};

const launchOptions = (
  entry: ACPAgent,
  database: Database,
  options: EngineTestOptions,
): EngineTestOptions => ({
  database,
  fetchAgents: async () =>
    JSON.stringify({ version: '1.0.0', agents: [entry] }),
  acp: createScriptedAgentProcess(),
  ...options,
});

const removeLaunchHost = (
  storage: ReturnType<typeof openTestDatabase>,
  projectPath: string,
): void => {
  storage.remove();
  rmSync(projectPath, { recursive: true, force: true });
};

export const requireInstalled = (
  host: EngineHost,
  id: string,
): InstalledAgent => {
  const answer = installedAgentsOf(host).installedAgent(id);

  if (!answer.installed) throw new Error('The fixture Agent is not installed');

  return answer.agent;
};
