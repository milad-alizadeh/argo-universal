import type { Argo, StorageResult } from '@argo/plugin-kit';
import type { PullReference } from './pull-reference';

// One Session's association with one pull request, in one Project: the Plugin's own record of what to read from GitHub.
export type PullLink = PullReference & { projectId: string; sessionId: string };

// The Plugin's own storage, which holds nothing but these associations (ADR-0052).
type Storage = Pick<Argo, 'storage'>;

/*
 * One row per Session per pull request, identified by repository plus number. A later increment adds columns, such as
 * where the association came from, without rewriting these rows. A repository is kept in lower case: GitHub names
 * match without regard to case.
 */
const table =
  'CREATE TABLE IF NOT EXISTS pull_associations (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, attached_at TEXT NOT NULL, PRIMARY KEY (project_id, session_id, repository, number))';

export type PullStore = {
  // Attaching twice is the same association, so the first time stands.
  attach: (link: PullLink) => Promise<void>;
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

function readyTables({ storage }: Storage): () => Promise<StorageResult> {
  let ready: Promise<StorageResult> | undefined;

  return () => {
    ready ??= storage.execute({ sql: table, params: [], method: 'run' });

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

export function createPullStore(argo: Storage): PullStore {
  const ready = readyTables(argo);

  const attach: PullStore['attach'] = async (link) => {
    await ready();
    await argo.storage.execute(insertOf(link));
  };

  const forSessions: PullStore['forSessions'] = async (sessionIds) => {
    await ready();

    return linksOf(await argo.storage.execute(selectFor(sessionIds)));
  };

  return { attach, forSessions };
}

const selectFor = (
  sessionIds: readonly string[],
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: `SELECT project_id, session_id, repository, number FROM pull_associations WHERE session_id IN (${sessionIds.map(() => '?').join(', ')}) ORDER BY attached_at, rowid`,
  params: [...sessionIds],
  method: 'all',
});
