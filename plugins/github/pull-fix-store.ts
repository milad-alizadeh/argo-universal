import type { Argo, StorageResult } from '@argo/plugin-kit';
import type { PullReference } from './pull-reference';

// The Plugin's own storage, as the Auto-fix records use it.
type Storage = Pick<Argo, 'storage'>;

type Link = PullReference & { projectId: string; sessionId: string };

// What Auto-fix keeps of one pull request of one Session: whether it is on, and the commit it stopped on.
export type FixRecord = Link & { enabled: boolean; stopHead: string | null };

type Statement = Parameters<Argo['storage']['execute']>[0];

/*
 * One row per Session per pull request the person has turned Auto-fix on for. `stop_head` is the head commit it gave up
 * on, so the reason is told only while that commit is still the head. The events table holds each Check failure
 * (`check:<name>`) per head commit: `sent` is 1 for a Prompt Auto-fix sent and 0 for a failure already there when it was
 * turned on, which is never prompted and never counted.
 */
const tables = [
  'CREATE TABLE IF NOT EXISTS pull_auto_fix (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, enabled INTEGER NOT NULL, stop_head TEXT, PRIMARY KEY (project_id, session_id, repository, number))',
  'CREATE TABLE IF NOT EXISTS pull_auto_fix_events (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, head TEXT NOT NULL, event_key TEXT NOT NULL, sent INTEGER NOT NULL, PRIMARY KEY (project_id, session_id, repository, number, head, event_key))',
];

export type FixStore = {
  // Every record of these Sessions.
  forSessions: (sessionIds: readonly string[]) => Promise<FixRecord[]>;
  // Every pull request of a Project that has Auto-fix on.
  enabledIn: (projectId: string) => Promise<FixRecord[]>;
  // Turns it on at once: clears the reason, starts the count again on this head, and notes the failures already there.
  enable: (link: Link, head: string, failed: readonly string[]) => Promise<void>;
  disable: (link: Link) => Promise<void>;
  // Turns it off and remembers the commit it gave up on.
  stop: (link: Link, head: string) => Promise<void>;
  // The Checks already seen failing on this head, and how many Prompts Auto-fix has sent on it.
  seen: (link: Link, head: string) => Promise<ReadonlySet<string>>;
  sent: (link: Link, head: string) => Promise<number>;
  record: (link: Link, head: string, check: string) => Promise<void>;
  unrecord: (link: Link, head: string, check: string) => Promise<void>;
  // Everything kept for a detached pull request.
  forget: (link: Link) => Promise<void>;
};

const eventKey = (check: string): string => `check:${check}`;

const keyOf = (link: Link): (string | number)[] => [
  link.projectId,
  link.sessionId,
  link.repository.toLowerCase(),
  link.number,
];

const where =
  'project_id = ? AND session_id = ? AND repository = ? AND number = ?';

const isRecord = (
  row: unknown,
): row is [string, string, string, number, number, string | null] =>
  Array.isArray(row) && row.length === 6 && typeof row[3] === 'number';

const recordOf = ([
  projectId,
  sessionId,
  repository,
  number,
  enabled,
  stopHead,
]: [string, string, string, number, number, string | null]): FixRecord => ({
  projectId,
  sessionId,
  repository,
  number,
  enabled: enabled === 1,
  stopHead,
});

const recordsOf = ({ rows }: StorageResult): FixRecord[] =>
  rows.filter(isRecord).map(recordOf);

const columns =
  'project_id, session_id, repository, number, enabled, stop_head';

const run = (sql: string, params: (string | number | null)[]): Statement => ({
  sql,
  params,
  method: 'run',
});

const all = (sql: string, params: (string | number | null)[]): Statement => ({
  sql,
  params,
  method: 'all',
});

export function createFixStore({ storage }: Storage): FixStore {
  let ready: Promise<unknown> | undefined;

  const execute = async (statement: Statement): Promise<StorageResult> => {
    ready ??= Promise.all(
      tables.map((sql) => storage.execute(run(sql, []))),
    );
    await ready;

    return storage.execute(statement);
  };

  const upsert = (link: Link, enabled: number, stopHead: string | null) =>
    execute(
      run(
        `INSERT INTO pull_auto_fix (${columns}) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(project_id, session_id, repository, number) DO UPDATE SET enabled = excluded.enabled, stop_head = excluded.stop_head`,
        [...keyOf(link), enabled, stopHead],
      ),
    );

  return {
    forSessions: async (sessionIds) =>
      recordsOf(
        await execute(
          all(
            `SELECT ${columns} FROM pull_auto_fix WHERE session_id IN (${sessionIds.map(() => '?').join(', ')})`,
            [...sessionIds],
          ),
        ),
      ),
    enabledIn: async (projectId) =>
      recordsOf(
        await execute(
          all(
            `SELECT ${columns} FROM pull_auto_fix WHERE project_id = ? AND enabled = 1`,
            [projectId],
          ),
        ),
      ),
    enable: async (link, head, failed) => {
      await upsert(link, 1, null);
      await execute(
        run(
          `UPDATE pull_auto_fix_events SET sent = 0 WHERE ${where} AND head = ?`,
          [...keyOf(link), head],
        ),
      );

      for (const check of failed)
        await execute(
          run(
            'INSERT INTO pull_auto_fix_events (project_id, session_id, repository, number, head, event_key, sent) VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT DO NOTHING',
            [...keyOf(link), head, eventKey(check)],
          ),
        );
    },
    disable: async (link) => {
      await upsert(link, 0, null);
    },
    stop: async (link, head) => {
      await upsert(link, 0, head);
    },
    seen: async (link, head) =>
      new Set(
        (
          await execute(
            all(
              `SELECT event_key FROM pull_auto_fix_events WHERE ${where} AND head = ?`,
              [...keyOf(link), head],
            ),
          )
        ).rows.map((row) => String(Array.isArray(row) ? row[0] : '')),
      ),
    sent: async (link, head) => {
      const [row] = (
        await execute(
          all(
            `SELECT COUNT(*) FROM pull_auto_fix_events WHERE ${where} AND head = ? AND sent = 1`,
            [...keyOf(link), head],
          ),
        )
      ).rows;

      return Number(Array.isArray(row) ? row[0] : 0);
    },
    record: async (link, head, check) => {
      await execute(
        run(
          'INSERT INTO pull_auto_fix_events (project_id, session_id, repository, number, head, event_key, sent) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT DO NOTHING',
          [...keyOf(link), head, eventKey(check)],
        ),
      );
    },
    unrecord: async (link, head, check) => {
      await execute(
        run(
          `DELETE FROM pull_auto_fix_events WHERE ${where} AND head = ? AND event_key = ?`,
          [...keyOf(link), head, eventKey(check)],
        ),
      );
    },
    forget: async (link) => {
      await execute(run(`DELETE FROM pull_auto_fix WHERE ${where}`, keyOf(link)));
      await execute(
        run(`DELETE FROM pull_auto_fix_events WHERE ${where}`, keyOf(link)),
      );
    },
  };
}
