import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync, SQLOutputValue, StatementSync } from 'node:sqlite';
import { attachReadOnly, openPluginDatabase } from '@repo/db/plugin-database';
import { z } from 'zod';

export const StorageQuery = z.object({
  sql: z.string(),
  params: z.array(z.union([z.string(), z.number(), z.null()])),
  method: z.enum(['run', 'all', 'get', 'values']),
});

export type StorageQuery = z.infer<typeof StorageQuery>;

// `get` answers one row, the other methods a list of rows: the shapes Drizzle's sqlite-proxy driver expects.
export const StorageResult = z.object({
  rows: z.array(z.unknown()),
});

export type StorageResult = z.infer<typeof StorageResult>;

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
  private readonly home: string;

  constructor(home: string) {
    this.home = home;
  }

  fileOf(pluginId: string): string {
    if (!idPattern.test(pluginId) || pluginId.includes('..'))
      throw new Error(`Invalid Plugin id: ${pluginId}`);

    return join(this.home, 'plugin-data', pluginId, databaseFile);
  }

  // Drizzle's sqlite-proxy migrator sends its statements as one batch, so a batch is one transaction.
  execute(pluginId: string, queries: StorageQuery[]): StorageResult[] {
    const database = this.open(pluginId);

    return inTransaction(database, () =>
      queries.map((query) => run(database, query)),
    );
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
    for (const database of this.databases.values()) database.close();
    this.databases.clear();
  }

  private open(pluginId: string): DatabaseSync {
    const existing = this.databases.get(pluginId);

    if (existing) return existing;
    const database = openPluginDatabase(this.fileOf(pluginId));
    this.databases.set(pluginId, database);

    return database;
  }
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
  all: (statement, params) => allRows(statement, params),
  values: (statement, params) => allRows(statement, params),
};

function run(database: DatabaseSync, query: StorageQuery): StorageResult {
  return runners[query.method](database.prepare(query.sql), query.params);
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
