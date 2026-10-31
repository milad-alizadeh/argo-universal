import path from 'node:path';
import { startOwnServer } from '@repo/e2e/own-server';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { GroupRelease } from '@repo/process';
import { seedDatabase } from './seed-database.mts';
import type { SeedCounts } from './seed-dataset.mts';
import { fixtureLauncher, type SeedLauncher } from './seed-launcher.mts';
import {
  environmentSeedOptions,
  seedConfiguration,
  type SeedConfiguration,
  type SeedOptions,
} from './seed-options.mts';
import { benchmarkTitles } from './seed-sessions.mts';

// A Server whose Project holds many Sessions, one of them with a long Feed, for the perf runs.
export interface SeededServer extends SeedCounts {
  // What this run drove, as its manifest records it.
  agent: string;
  serverUrl: string;
  longSessionTitle: string;
  shortSessionTitle: string;
  sessionCount: number;
  requested: SeedConfiguration;
  httpUrl: string;
  // The Project's git repository, which the diff scenarios write their changes into.
  projectPath: string;
  stop: () => Promise<GroupRelease>;
  // Stops the Server, awaits `whileStopped`, then starts it again on the same port and data.
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
}

export type ServerProcess = Pick<
  Awaited<ReturnType<typeof startOwnServer>>,
  'serverUrl' | 'httpUrl' | 'stop' | 'restart'
>;

interface SeedOutcome {
  counts: SeedCounts;
  requested: SeedConfiguration;
  agent: string;
}

function serverView(
  server: ServerProcess,
  { counts, requested, agent }: SeedOutcome,
): Omit<SeededServer, 'projectPath'> {
  return {
    ...server,
    ...benchmarkTitles,
    sessionCount: requested.sessions,
    requested,
    agent,
    ...counts,
  };
}

/*
 * Gives `launcher`'s Server one real Session, then clones it into many Sessions and copies of the
 * recorded Feeds, and starts the Server that serves them.
 */
export async function seedWith(
  launcher: SeedLauncher,
  directory: string,
  options: SeedOptions = environmentSeedOptions(),
): Promise<SeededServer> {
  const requested = seedConfiguration(options);
  await launcher.template(directory);
  const databasePath = path.join(directory, 'server-home', 'argo.db');
  const counts = await seedDatabase(databasePath, requested);
  const server = await launcher.start(directory);

  return {
    ...serverView(server, { counts, requested, agent: launcher.agent }),
    projectPath: path.join(directory, 'project'),
  };
}

/*
 * Starts a fixture Server, gives it one real Session, then clones it into many Sessions and copies of the recorded Feeds.
 * `agents` sets the scenario the Server's Agents play; the template Session always runs the default.
 */
export const startSeededServer = (
  directory: string,
  options: SeedOptions = environmentSeedOptions(),
  agents: AppFixtureAgents = {},
): Promise<SeededServer> =>
  seedWith(fixtureLauncher(agents), directory, options);
