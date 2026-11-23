import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const folderLockFile = 'engine.lock';

// The lock each locked folder holds, by folder.
const folderLocks = new Map<string, DatabaseSync>();

// One process at a time owns the database in `folder`: another would migrate and repair it under the owner. The lock is SQLite's own file lock, which the operating system frees when the process ends.
export function lockDatabaseFolder(folder: string): void {
  mkdirSync(folder, { recursive: true });
  const lock = new DatabaseSync(join(folder, folderLockFile));

  try {
    lock.exec('BEGIN EXCLUSIVE');
  } catch (error) {
    lock.close();
    throw new Error(`Another process is using ${folder}`, { cause: error });
  }

  folderLocks.set(folder, lock);
}

export function unlockDatabaseFolder(folder: string): void {
  folderLocks.get(folder)?.close();
  folderLocks.delete(folder);
}
