import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StatementSync } from 'node:sqlite';
import { type Database, openDatabase } from '@repo/db';
import { project, session, turn } from '@repo/db/schema';
import { onTestFinished, vi } from 'vitest';

interface TestDatabase {
  database: Database;
  directory: string;
  remove: () => void;
}

// A database in a new temp directory holding `project-1` and its Session `session-1`; `remove` closes and deletes it.
export function openTestDatabase(
  sessionValues: Partial<typeof session.$inferInsert> = {},
  projectPath = '/project',
): TestDatabase {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'argo-server-')));
  const database = openDatabase(join(directory, 'argo.db'));
  insertProject(database, projectPath);
  insertSession(database, sessionValues);

  return {
    database,
    directory,
    remove: (): void => removeDatabase(database, directory),
  };
}

const insertProject = (database: Database, path: string): void => {
  database
    .insert(project)
    .values({ id: 'project-1', path, name: 'project' })
    .run();
};

const removeDatabase = (database: Database, directory: string): void => {
  if (database.$client.isOpen) database.$client.close();
  rmSync(directory, { recursive: true, force: true });
};

// A Session of `project-1`, `session-1` unless `values` names another.
export function insertSession(
  database: Database,
  values: Partial<typeof session.$inferInsert> = {},
): void {
  database.insert(session).values(sessionRow(values)).run();
}

const sessionRow = (
  values: Partial<typeof session.$inferInsert>,
): typeof session.$inferInsert => ({
  id: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  checkoutPath: '/project',
  projectionVersion: 1,
  ...values,
});

// An ended first Turn of `session-1` unless `sessionId` names another; a Session is listed once a Turn started.
export function insertEndedTurn(
  database: Database,
  sessionId = 'session-1',
): void {
  database.insert(turn).values(endedTurnRow(sessionId)).run();
}

const endedTurnRow = (sessionId: string): typeof turn.$inferInsert => ({
  id: `${sessionId}-first-turn`,
  sessionId,
  status: 'ended',
  startedAt: 0,
  endedAt: 0,
  stopReason: 'end_turn',
});

interface ReadMetrics {
  queries: number;
  rows: number;
  largestRead: number;
  sessionReads: number;
}

interface CountedDatabase {
  database: Database;
  metrics: ReadMetrics;
}

// A read whose main table is `session`; joins and other tables do not count.
const sessionRead = / from "session"(?: |$)/;

// Counts executed reads at the real SQLite query port without replacing their results.
export function countDatabaseReads(database: Database): CountedDatabase {
  const metrics = { queries: 0, rows: 0, largestRead: 0, sessionReads: 0 };
  const client = database.$client;
  const prepare = client.prepare.bind(client);

  const observed = vi
    .spyOn(client, 'prepare')
    .mockImplementation((sql): StatementSync =>
      sql.startsWith('select ')
        ? countStatementReads(prepare(sql), metrics, sessionRead.test(sql))
        : prepare(sql),
    );

  onTestFinished((): void => observed.mockRestore());

  return { database, metrics };
}

function countStatementReads(
  statement: StatementSync,
  metrics: ReadMetrics,
  fromSession: boolean,
): StatementSync {
  const all = statement.all.bind(statement);

  vi.spyOn(statement, 'all').mockImplementation((...parameters) => {
    const rows = all(...parameters);
    recordRead(metrics, rows.length, fromSession);

    return rows;
  });
  countGets(statement, metrics, fromSession);

  return statement;
}

function countGets(
  statement: StatementSync,
  metrics: ReadMetrics,
  fromSession: boolean,
): void {
  const get = statement.get.bind(statement);
  vi.spyOn(statement, 'get').mockImplementation((...parameters) => {
    const row = get(...parameters);
    recordRead(metrics, Number(row !== undefined), fromSession);

    return row;
  });
}

function recordRead(
  metrics: ReadMetrics,
  rows: number,
  fromSession: boolean,
): void {
  metrics.queries += 1;

  if (fromSession) metrics.sessionReads += 1;
  metrics.rows += rows;
  metrics.largestRead = Math.max(metrics.largestRead, rows);
}
