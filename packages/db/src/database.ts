import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { drizzle, type NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

// Resolved from this file, so the Server finds the migrations from any working directory.
export const migrationsFolder = fileURLToPath(
  new URL('../drizzle', import.meta.url),
);

export type Database = NodeSQLiteDatabase & { $client: DatabaseSync };

// Opens the SQLite file at `filePath` (the Server passes `~/.argo/argo.db`), turns on WAL, and migrates it.
export function openDatabase(
  filePath: string,
  options: { convertLegacyAgentCatalog?: LegacyAgentCatalogConverter } = {},
): Database {
  mkdirSync(dirname(filePath), { recursive: true });
  const client = new DatabaseSync(filePath);
  client.exec('PRAGMA journal_mode = WAL');
  const database = drizzle({ client });
  registerLegacyAgentCatalogConversion(
    client,
    options.convertLegacyAgentCatalog,
  );
  migrateOwnedDatabase(database);
  return database;
}

// Only the published catalog-to-agents migration calls this converter. The
// composition owner validates upstream metadata; DB retains connection ownership.
export type LegacyAgentCatalogConverter = (
  payload: unknown,
  fetchedAt: unknown,
) => string;

function registerLegacyAgentCatalogConversion(
  client: DatabaseSync,
  convertLegacyAgentCatalog: LegacyAgentCatalogConverter | undefined,
): void {
  client.function('convert_legacy_agent_catalog', (payload, fetchedAt) => {
    if (!convertLegacyAgentCatalog)
      throw new Error(
        'Legacy Agent catalog conversion requires its metadata reader',
      );
    return convertLegacyAgentCatalog(payload, fetchedAt);
  });
}

function migrateOwnedDatabase(database: Database): void {
  try {
    migrate(database, { migrationsFolder });
  } catch (error) {
    database.$client.close();
    throw error;
  }
}
