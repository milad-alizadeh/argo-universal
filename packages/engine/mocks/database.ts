import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentAdapters } from '@repo/agents';
import { type Database, openDatabase } from '@repo/db';
import { agents, project, session } from '@repo/db/schema';
import { notInArray } from 'drizzle-orm';
import { onTestFinished, vi } from 'vitest';

// A database in a new temp directory holding `project-1` and its Session `session-1`; `remove` closes and deletes it.
export function openTestDatabase(
  sessionValues: Partial<typeof session.$inferInsert> = {},
  projectPath = '/project',
): { database: Database; directory: string; remove: () => void } {
  const directory = mkdtempSync(join(tmpdir(), 'argo-server-'));
  const database = openDatabase(join(directory, 'argo.db'));
  database
    .insert(project)
    .values({ id: 'project-1', path: projectPath, name: 'project' })
    .run();
  insertSession(database, sessionValues);
  return {
    database,
    directory,
    remove: (): void => {
      if (database.$client.isOpen) database.$client.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

// A Session of `project-1`, `session-1` unless `values` names another.
export function insertSession(
  database: Database,
  values: Partial<typeof session.$inferInsert> = {},
): void {
  database
    .insert(session)
    .values({
      id: 'session-1',
      projectId: 'project-1',
      agent: 'mock',
      checkoutPath: '/project',
      projectionVersion: 1,
      ...values,
    })
    .run();
}

// Counts executed reads at the real SQLite query port without replacing their results.
export function countDatabaseReads(database: Database): {
  database: Database;
  metrics: { queries: number; rows: number; sessionReads: number };
} {
  const metrics = { queries: 0, rows: 0, sessionReads: 0 };
  const chain = new Set(['select', 'from', 'where', 'orderBy', 'limit']);
  const counted = <Value extends object>(
    value: Value,
    fromSession = false,
  ): Value =>
    new Proxy(value, {
      get(target, property, receiver): ReturnType<typeof Reflect.get> {
        const member = Reflect.get(target, property, receiver);
        if (typeof member !== 'function') return member;
        return (...arguments_: unknown[]): ReturnType<typeof Reflect.apply> => {
          const result = Reflect.apply(member, target, arguments_);
          if (property === 'all' || property === 'get') {
            metrics.queries += 1;
            if (fromSession) metrics.sessionReads += 1;
            metrics.rows += Array.isArray(result)
              ? result.length
              : Number(result !== undefined);
          }
          return chain.has(String(property))
            ? counted(
                result,
                property === 'from' ? arguments_[0] === session : fromSession,
              )
            : result;
        };
      },
    });
  const select = counted(database).select.bind(database);
  const observed = vi.spyOn(database, 'select').mockImplementation(select);
  onTestFinished((): void => observed.mockRestore());
  return { database, metrics };
}

// Agent rows other than the native Agent identities every database starts with.
export function readAddedAgentRows(
  database: Database,
): (typeof agents.$inferSelect)[] {
  return database
    .select()
    .from(agents)
    .where(
      notInArray(
        agents.id,
        agentAdapters.map(({ agent }) => agent),
      ),
    )
    .all();
}
