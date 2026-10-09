import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsFolder, type Database } from '../src/database';
import { project, session, turn, feedRow } from '../src/schema';

interface PreSpecHistoryDatabase {
  database: Database;
  directory: string;
  remove(): void;
}

// These are the unchanged migration directories on main before Spec 0009.
const mainSchemaMigrations = [
  '20261003025356_init',
  '20261003025357_updated_at_triggers',
  '20261005152224_session_list',
  '20261005181747_new_session',
  '20261005192552_session_config_values',
  '20261007215604_session_turn_index',
];

export function openPreSpecDatabaseWithHistory(
  savedAgentIds: readonly string[],
): PreSpecHistoryDatabase {
  const directory = mkdtempSync(join(tmpdir(), 'argo-history-upgrade-'));
  const database = openMainSchemaDatabase(directory);
  seedStoredSessionHistory(database, savedAgentIds);
  return {
    database,
    directory,
    remove: () => removePreSpecHistoryDatabase(database, directory),
  };
}

function openMainSchemaDatabase(directory: string): Database {
  const mainMigrationsFolder = join(directory, 'migrations');
  for (const name of mainSchemaMigrations)
    cpSync(join(migrationsFolder, name), join(mainMigrationsFolder, name), {
      recursive: true,
    });
  const database = drizzle({
    client: new DatabaseSync(join(directory, 'argo.db')),
  });
  migrate(database, { migrationsFolder: mainMigrationsFolder });
  return database;
}

const savedSession = {
  projectId: 'project-1',
  title: 'Saved conversation',
  checkoutPath: '/saved',
  projectionVersion: 1,
};
const savedTurn = { status: 'ended', stopReason: 'end_turn' } as const;
const savedFeedRow = {
  position: 0,
  sessionUpdate: 'user_message',
  revision: 1,
  state: 'settled',
  payload: { text: 'Saved prompt' },
  payloadVersion: 1,
} as const;

function seedStoredSessionHistory(
  database: Database,
  savedAgentIds: readonly string[],
): void {
  database
    .insert(project)
    .values({ id: 'project-1', name: 'Saved project', path: '/saved' })
    .run();
  for (const [position, agentId] of savedAgentIds.entries())
    seedStoredSession(database, agentId, position);
}

function seedStoredSession(
  database: Database,
  agentId: string,
  position: number,
): void {
  const sessionId = 'saved-session-' + position;
  const turnId = 'saved-turn-' + position;
  database
    .insert(session)
    .values({ ...savedSession, id: sessionId, agent: agentId })
    .run();
  seedStoredTurn(database, { sessionId, turnId }, position);
}

function seedStoredTurn(
  database: Database,
  historyIds: { sessionId: string; turnId: string },
  position: number,
): void {
  const { sessionId, turnId } = historyIds;
  database
    .insert(turn)
    .values({ ...savedTurn, id: turnId, sessionId })
    .run();
  database
    .insert(feedRow)
    .values(createStoredFeedRow(sessionId, turnId, position))
    .run();
}

function createStoredFeedRow(
  sessionId: string,
  turnId: string,
  position: number,
): typeof feedRow.$inferInsert {
  return {
    ...savedFeedRow,
    sessionId,
    turnId,
    id: 'saved-message-' + position,
  };
}

function removePreSpecHistoryDatabase(
  database: Database,
  directory: string,
): void {
  if (database.$client.isOpen) database.$client.close();
  rmSync(directory, { recursive: true, force: true });
}
