import { startOwnServer } from '@repo/e2e/own-server';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { fixtureAgentCondition } from './manifest.mts';
import type { ServerProcess } from './seed.mts';
import { withTemplateSession } from './template-session.mts';

/*
 * How a seeded run gets its Server. Seeding is the same work either way — one real Session, cloned
 * into many and into copies of the recorded Feeds — but which Server runs it is not: the fixture
 * launcher replays scripted Agents, and a real-Agent launcher installs an Agent the owner is signed
 * in to. The launcher also states what the run's manifest records about its Agent, so a real-Agent
 * report cannot inherit the fixture's wording.
 */
export interface SeedLauncher {
  // Gives a fresh Server in `directory` the one real Session the seed clones, and stops it again.
  template: (directory: string) => Promise<void>;
  // Starts the Server that serves the seeded data.
  start: (directory: string) => Promise<ServerProcess>;
  // What this run drove, for the report's `agent` condition.
  agent: string;
}

/*
 * The fixture launcher: scripted Agents, replayed at a fixed rate. `agents` sets the scenario the
 * Server's Agents play; the template Session always runs the default.
 */
export const fixtureLauncher = (
  agents: AppFixtureAgents = {},
): SeedLauncher => ({
  template: withTemplateSession,
  start: (directory) => startOwnServer(directory, agents),
  agent: fixtureAgentCondition,
});
