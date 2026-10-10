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
  migrations = migrationsFolder,
): Database {
  mkdirSync(dirname(filePath), { recursive: true });
  const client = new DatabaseSync(filePath);
  client.exec('PRAGMA journal_mode = WAL');
  const database = drizzle({ client });
  migrate(database, { migrationsFolder: migrations });
  return database;
}
