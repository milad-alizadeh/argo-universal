import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync, SQLOutputValue, StatementSync } from 'node:sqlite';
import {
  attachReadOnly,
  openPluginDatabase,
  openReadOnlyDatabase,
} from '@repo/db/plugin-database';
import type { StorageQuery, StorageResult } from '../protocol/runtime';

const databaseFile = 'plugin.db';

// Plugin ids come from validated manifests; the folder name must still never escape `plugin-data`.
const idPattern = /^[A-Za-z0-9][\w.-]*$/;

/*
 * One SQLite file per Plugin under `<home>/plugin-data/<id>/`, created by the
 * Plugin's first query. Argo's own database never learns about these files;
 * the Server only ever reads them, through `attachReadOnly`.
 */
export class PluginStorage {
  private readonly databases = new Map<string, DatabaseSync>();
  private readonly readers = new Map<string, DatabaseSync>();
  private readonly writers = new Set<(pluginId: string) => void>();
  private readonly home: string;
  private closed = false;

  constructor(home: string) {
    this.home = home;
  }

  // The Plugin's data folder, the only one its `argo.fs` calls may write (ADR-0030).
  folderOf(pluginId: string): string {
    if (!idPattern.test(pluginId) || pluginId.includes('..'))
      throw new Error(`Invalid Plugin id: ${pluginId}`);

    return join(this.home, 'plugin-data', pluginId);
  }

  private fileOf(pluginId: string): string {
    return join(this.folderOf(pluginId), databaseFile);
  }

  // Drizzle's sqlite-proxy migrator sends its statements as one batch, so a batch is one transaction.
  execute(
    pluginId: string,
    queries: StorageQuery[],
    readOnly?: boolean,
  ): StorageResult[] {
    if (this.closed) throw new Error('Plugin storage is closed');

    if (readOnly) return executeQueries(this.reader(pluginId), queries, true);

    return this.write(pluginId, queries);
  }

  private write(pluginId: string, queries: StorageQuery[]): StorageResult[] {
    const database = this.open(pluginId);
    const before = changeStamp(database);
    const result = executeQueries(database, queries, false);

    if (changeStamp(database) !== before) this.written(pluginId);

    return result;
  }

  private written(pluginId: string): void {
    for (const written of this.writers) written(pluginId);
  }

  onWrite(written: (pluginId: string) => void): void {
    this.writers.add(written);
  }

  private reader(pluginId: string): DatabaseSync {
    this.open(pluginId);
    let reader = this.readers.get(pluginId);

    if (!reader) {
      reader = openReadOnlyDatabase(this.fileOf(pluginId));
      this.readers.set(pluginId, reader);
    }

    return reader;
  }

  // Returns false, and creates nothing, for a Plugin that never used storage.
  attachReadOnly(
    target: DatabaseSync,
    pluginId: string,
    alias: string,
  ): boolean {
    const file = this.fileOf(pluginId);

    if (!existsSync(file)) return false;
    attachReadOnly(target, file, alias);

    return true;
  }

  close(): void {
    this.closed = true;

    for (const database of this.databases.values()) database.close();

    for (const reader of this.readers.values()) reader.close();
    this.databases.clear();
    this.readers.clear();
    this.writers.clear();
  }

  private open(pluginId: string): DatabaseSync {
    const existing = this.databases.get(pluginId);

    if (existing) return existing;
    const database = openPluginDatabase(this.fileOf(pluginId));
    this.databases.set(pluginId, database);

    return database;
  }
}

function executeQueries(
  database: DatabaseSync,
  queries: StorageQuery[],
  readOnly: boolean,
): StorageResult[] {
  return inTransaction(database, () =>
    queries.map((query) => runQuery(database, query, readOnly)),
  );
}

function changeStamp(database: DatabaseSync): string {
  return JSON.stringify([
    database.prepare('SELECT total_changes()').get(),
    database.prepare('PRAGMA schema_version').get(),
  ]);
}

function inTransaction<T>(database: DatabaseSync, work: () => T): T {
  database.exec('BEGIN');

  try {
    const result = work();
    database.exec('COMMIT');

    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

type Row = Record<string, SQLOutputValue> | undefined;

const runners: Record<
  StorageQuery['method'],
  (statement: StatementSync, params: StorageQuery['params']) => StorageResult
> = {
  run: (statement, params) => {
    statement.run(...params);

    return { rows: [] };
  },
  get: (statement, params) => {
    statement.setReturnArrays(true);

    return { rows: rowOf(statement.get(...params)) };
  },
  all: allRows,
  values: allRows,
};

function runQuery(
  database: DatabaseSync,
  query: StorageQuery,
  readOnly: boolean,
): StorageResult {
  const statement = database.prepare(query.sql);

  if (readOnly && !statement.columns().length)
    throw new Error('A storage Query must return rows');

  return runners[query.method](statement, query.params);
}

function allRows(
  statement: StatementSync,
  params: StorageQuery['params'],
): StorageResult {
  statement.setReturnArrays(true);

  return { rows: statement.all(...params).map((row) => rowOf(row)) };
}

// With `setReturnArrays` a row is an array at run time, which the typings do not express.
const rowOf = (row: Row): SQLOutputValue[] => (Array.isArray(row) ? row : []);
