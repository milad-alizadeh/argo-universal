import type { Argo, StorageResult } from '@argo/plugin-kit';
import type { PullReference } from './pull-reference';

// One pull request as a Project reads it: the key of what is kept of it.
export type PullKey = PullReference & { projectId: string };

// One Session's association with one pull request, in one Project: the Plugin's own record of what to read from GitHub.
export type PullLink = PullKey & { sessionId: string };

// The Plugin's own storage, which holds nothing but these associations (ADR-0052).
type Storage = Pick<Argo, 'storage'>;

/*
 * One row per Session per pull request, identified by repository plus number. A later increment adds columns, such as
 * where the association came from, without rewriting these rows. A repository is kept in lower case: GitHub names
 * match without regard to case.
 */
const table =
  'CREATE TABLE IF NOT EXISTS pull_associations (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, attached_at TEXT NOT NULL, PRIMARY KEY (project_id, session_id, repository, number))';

/*
 * One row per pull request detached from a Session, so a detach sticks: discovery never attaches it to that Session
 * again, and an Agent attaches it again only when the person asks (#2470). Attaching it clears the row.
 */
const detachedTable =
  'CREATE TABLE IF NOT EXISTS pull_detached (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, detached_at TEXT NOT NULL, PRIMARY KEY (project_id, session_id, repository, number))';

export type PullStore = {
  // Attaching twice is the same association, so the first time stands; it forgets that the pull request was detached.
  attach: (link: PullLink) => Promise<void>;
  // Removes only this association, and remembers it was detached; one that is not there is already detached.
  detach: (link: PullLink) => Promise<void>;
  // Whether this pull request was detached from this Session and not attached since.
  detached: (link: PullLink) => Promise<boolean>;
  // The pull requests these Sessions are associated with, the earliest attached first.
  forSessions: (sessionIds: readonly string[]) => Promise<PullLink[]>;
};

const linkColumns = 4;

const isLinkRow = (row: unknown): row is [string, string, string, number] =>
  Array.isArray(row) &&
  row.length === linkColumns &&
  Number.isSafeInteger(row[linkColumns - 1]);

const linkOf = ([projectId, sessionId, repository, number]: [
  string,
  string,
  string,
  number,
]): PullLink => ({ projectId, sessionId, repository, number });

const linksOf = ({ rows }: StorageResult): PullLink[] =>
  rows.filter(isLinkRow).map(linkOf);

const created = async ({ storage }: Storage): Promise<StorageResult> => {
  await storage.execute({ sql: table, params: [], method: 'run' });

  return storage.execute({ sql: detachedTable, params: [], method: 'run' });
};

function readyTables(argo: Storage): () => Promise<StorageResult> {
  let ready: Promise<StorageResult> | undefined;

  return () => {
    ready ??= created(argo);

    return ready;
  };
}

const insert =
  'INSERT INTO pull_associations (project_id, session_id, repository, number, attached_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id, session_id, repository, number) DO NOTHING';

const insertOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: insert,
  params: [
    link.projectId,
    link.sessionId,
    link.repository.toLowerCase(),
    link.number,
    new Date().toISOString(),
  ],
  method: 'run',
});

const keyParams = (link: PullLink): (string | number)[] => [
  link.projectId,
  link.sessionId,
  link.repository.toLowerCase(),
  link.number,
];

const remove =
  'DELETE FROM pull_associations WHERE project_id = ? AND session_id = ? AND repository = ? AND number = ?';

const deleteOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: remove,
  params: keyParams(link),
  method: 'run',
});

const markDetached =
  'INSERT INTO pull_detached (project_id, session_id, repository, number, detached_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id, session_id, repository, number) DO UPDATE SET detached_at = excluded.detached_at';

const markOf = (link: PullLink): Parameters<Argo['storage']['execute']>[0] => ({
  sql: markDetached,
  params: [...keyParams(link), new Date().toISOString()],
  method: 'run',
});

const unmarkOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: 'DELETE FROM pull_detached WHERE project_id = ? AND session_id = ? AND repository = ? AND number = ?',
  params: keyParams(link),
  method: 'run',
});

const markedOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: 'SELECT 1 FROM pull_detached WHERE project_id = ? AND session_id = ? AND repository = ? AND number = ?',
  params: keyParams(link),
  method: 'all',
});

// Each statement waits for the table, then runs.
const writing =
  (argo: Storage, ready: Ready) =>
  async (
    statement: Parameters<Argo['storage']['execute']>[0],
  ): Promise<void> => {
    await ready();
    await argo.storage.execute(statement);
  };

type Ready = () => Promise<StorageResult>;

const reading =
  (argo: Storage, ready: Ready) =>
  async (sessionIds: readonly string[]): Promise<PullLink[]> => {
    await ready();

    return linksOf(await argo.storage.execute(selectFor(sessionIds)));
  };

type Write = ReturnType<typeof writing>;

// Each write is two statements: the association and the detached mark, which never hold for the same link.
const both =
  (write: Write, first: StatementOf, second: StatementOf) =>
  async (link: PullLink): Promise<void> => {
    await write(first(link));
    await write(second(link));
  };

type StatementOf = (
  link: PullLink,
) => Parameters<Argo['storage']['execute']>[0];

const detachedReading =
  (argo: Storage, ready: Ready) =>
  async (link: PullLink): Promise<boolean> => {
    await ready();

    return (await argo.storage.execute(markedOf(link))).rows.length > 0;
  };

export function createPullStore(argo: Storage): PullStore {
  const ready = readyTables(argo);
  const write = writing(argo, ready);

  return {
    attach: both(write, unmarkOf, insertOf),
    detach: both(write, deleteOf, markOf),
    detached: detachedReading(argo, ready),
    forSessions: reading(argo, ready),
  };
}

const selectFor = (
  sessionIds: readonly string[],
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: `SELECT project_id, session_id, repository, number FROM pull_associations WHERE session_id IN (${sessionIds.map(() => '?').join(', ')}) ORDER BY attached_at, rowid`,
  params: [...sessionIds],
  method: 'all',
});
