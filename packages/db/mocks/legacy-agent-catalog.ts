import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsFolder, type Database } from '../src/database';
import { project, session, turn, feedRow } from '../src/schema';

interface LegacyCatalogDatabase {
  database: Database;
  directory: string;
  remove(): void;
}

export function openLegacyCatalogDatabase(
  historicalAgentId: string,
): LegacyCatalogDatabase {
  const directory = mkdtempSync(join(tmpdir(), 'argo-catalog-upgrade-'));
  const database = openDatabaseBeforeCatalogConversion(directory);
  seedLegacySessionHistory(database, historicalAgentId);
  return {
    database,
    directory,
    remove: () => removeLegacyCatalogDatabase(database, directory),
  };
}

function openDatabaseBeforeCatalogConversion(directory: string): Database {
  const legacyMigrations = join(directory, 'migrations');
  cpSync(migrationsFolder, legacyMigrations, {
    recursive: true,
    filter: (path) => !path.includes('20261009165742_agents'),
  });
  const database = drizzle({
    client: new DatabaseSync(join(directory, 'argo.db')),
  });
  migrate(database, { migrationsFolder: legacyMigrations });
  return database;
}

const legacySession = {
  id: 'session-1',
  projectId: 'project-1',
  title: 'Saved conversation',
  checkoutPath: '/saved',
  projectionVersion: 1,
};
const legacyTurn: typeof turn.$inferInsert = {
  id: 'saved-turn',
  sessionId: 'session-1',
  status: 'ended',
  stopReason: 'end_turn',
};
const legacyFeedRow: typeof feedRow.$inferInsert = {
  sessionId: 'session-1',
  position: 0,
  id: 'saved-message',
  sessionUpdate: 'user_message',
  revision: 1,
  turnId: 'saved-turn',
  state: 'settled',
  payload: { text: 'Saved prompt' },
  payloadVersion: 1,
};

function seedLegacySessionHistory(
  database: Database,
  historicalAgentId: string,
): void {
  database
    .insert(project)
    .values({ id: 'project-1', name: 'Saved project', path: '/saved' })
    .run();
  database
    .insert(session)
    .values({ ...legacySession, agent: historicalAgentId })
    .run();
  database.insert(turn).values(legacyTurn).run();
  database.insert(feedRow).values(legacyFeedRow).run();
}

function removeLegacyCatalogDatabase(
  database: Database,
  directory: string,
): void {
  if (database.$client.isOpen) database.$client.close();
  rmSync(directory, { recursive: true, force: true });
}
