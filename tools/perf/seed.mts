import path from 'node:path';
import { startOwnServer } from '@repo/e2e/own-server';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { GroupRelease } from '@repo/process';
import { seedDatabase } from './seed-database.mts';
import type { SeedCounts } from './seed-dataset.mts';
import {
  environmentSeedOptions,
  seedConfiguration,
  type SeedConfiguration,
  type SeedOptions,
} from './seed-options.mts';
import { benchmarkTitles } from './seed-sessions.mts';
import { withTemplateSession } from './template-session.mts';

// A Server whose Project holds many Sessions, one of them with a long Feed, to profile the App against.
export interface SeededServer extends SeedCounts {
  serverUrl: string;
  longSessionTitle: string;
  shortSessionTitle: string;
  sessionCount: number;
  requested: SeedConfiguration;
  httpUrl: string;
  stop: () => Promise<GroupRelease>;
}

async function seedData(
  directory: string,
  requested: SeedConfiguration,
): Promise<SeedCounts> {
  await withTemplateSession(directory);

  return seedDatabase(
    path.join(directory, 'server-home', 'argo.db'),
    requested,
  );
}

/*
 * Starts a fixture Server, gives it one real Session, then clones it into many Sessions and copies of the recorded Feeds.
 * `agents` sets the scenario the Server's Agents play; the template Session always runs the default.
 */
export async function startSeededServer(
  directory: string,
  options: SeedOptions = environmentSeedOptions(),
  agents: AppFixtureAgents = {},
): Promise<SeededServer> {
  const requested = seedConfiguration(options);
  const counts = await seedData(directory, requested);

  return {
    ...(await startOwnServer(directory, agents)),
    ...benchmarkTitles,
    sessionCount: requested.sessions,
    requested,
    ...counts,
  };
}
