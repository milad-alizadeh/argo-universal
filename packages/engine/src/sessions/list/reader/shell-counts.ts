import type { Database } from '@repo/db';
import { session, shell } from '@repo/db/schema';
import { and, count, eq, sql, type SQL } from 'drizzle-orm';

type ShellCountColumns = { shellTotal: SQL<number>; shellRunning: SQL<number> };

export function shellCountColumns(database: Database): ShellCountColumns {
  return {
    shellTotal: shellCount(database, false),
    shellRunning: shellCount(database, true),
  };
}

function shellCount(database: Database, running: boolean): SQL<number> {
  return sql<number>`(${database.select({ total: count() }).from(shell).where(shellFilter(running))})`;
}

function shellFilter(running: boolean): SQL | undefined {
  return and(
    eq(shell.sessionId, session.id),
    running ? eq(shell.status, 'running') : undefined,
  );
}
