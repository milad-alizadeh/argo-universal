import { join } from 'node:path';
import { openDatabase, type Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';
import { onTestFinished, vi } from 'vitest';
import { seedAgentFixtures } from './agent-fixtures';
import type { openTestDatabase } from './database';
import type { EngineTestOptions } from './engine';

export function seedTestCommands(
  options: EngineTestOptions,
  home: string,
  storage: ReturnType<typeof openTestDatabase> | undefined,
): void {
  seedWorkingDirectory();

  const seeded = seedDatabase(options, home, storage);
  seedAgentFixtures(
    seeded,
    options.fixtureAgents ?? defaultFixtureAgents(options),
  );

  if (options.storedRegistry) seedEmptyRegistry(seeded);
  closeSeedDatabase(seeded, options, storage);
}

const defaultFixtureAgents = (
  options: EngineTestOptions,
): readonly AgentIdentity[] =>
  options.fetchAgents ? [] : [{ agent: 'mock', label: 'mock', logo: '' }];

const seedDatabase = (
  options: EngineTestOptions,
  home: string,
  storage: ReturnType<typeof openTestDatabase> | undefined,
): Database => options.database ?? storageDatabase(storage, home);

const storageDatabase = (
  storage: ReturnType<typeof openTestDatabase> | undefined,
  home: string,
): Database => storage?.database ?? openDatabase(join(home, 'argo.db'));

const seedEmptyRegistry = (database: Database): void => {
  database.$client
    .prepare(
      'INSERT OR IGNORE INTO registry_cache (id, json, fetched_at) VALUES (1, ?, 0)',
    )
    .run(JSON.stringify({ version: '1.0.0', agents: [], extensions: [] }));
};

const closeSeedDatabase = (
  database: Database,
  options: EngineTestOptions,
  storage: ReturnType<typeof openTestDatabase> | undefined,
): void => {
  if (!options.database && !storage) database.$client.close();
};

// A first run has no Projects, but most tests want one: the Engine registers the working directory unless the test set ARGO_PROJECT_PATH, even to nothing.
function seedWorkingDirectory(): void {
  if (process.env.ARGO_PROJECT_PATH !== undefined) return;

  vi.stubEnv('ARGO_PROJECT_PATH', process.cwd());
  onTestFinished((): void => void vi.unstubAllEnvs());
}
