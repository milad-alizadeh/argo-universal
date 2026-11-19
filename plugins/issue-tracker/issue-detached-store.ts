import type { IssueLink, SessionStore } from './issue-sessions-store';

/*
 * One row per Issue detached from a Session, so a detach sticks: an Agent attaches it again only when the person asks
 * (#2470). Attaching it clears the row.
 */
export const issueDetachedTable =
  'CREATE TABLE IF NOT EXISTS issue_detached (project_id TEXT NOT NULL, issue_number INTEGER NOT NULL, session_id TEXT NOT NULL, detached_at TEXT NOT NULL, PRIMARY KEY (project_id, issue_number, session_id))';

const keyOf = ({
  projectId,
  number,
  sessionId,
}: IssueLink): (string | number)[] => [projectId, number, sessionId];

// Remembers that the Issue was detached from the Session; the store's tables are already in place.
export async function markDetached(
  { argo }: SessionStore,
  link: IssueLink,
): Promise<void> {
  await argo.storage.execute({
    sql: 'INSERT INTO issue_detached (project_id, issue_number, session_id, detached_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, issue_number, session_id) DO UPDATE SET detached_at = excluded.detached_at',
    params: [...keyOf(link), new Date().toISOString()],
    method: 'run',
  });
}

// Forgets that the Issue was detached, as attaching it again does.
export async function unmarkDetached(
  { argo }: SessionStore,
  link: IssueLink,
): Promise<void> {
  await argo.storage.execute({
    sql: 'DELETE FROM issue_detached WHERE project_id = ? AND issue_number = ? AND session_id = ?',
    params: keyOf(link),
    method: 'run',
  });
}

// Whether this Issue was detached from this Session and not attached since.
export async function detachedSession(
  store: SessionStore,
  link: IssueLink,
): Promise<boolean> {
  await store.ensureTables();

  const result = await store.argo.storage.execute({
    sql: 'SELECT 1 FROM issue_detached WHERE project_id = ? AND issue_number = ? AND session_id = ?',
    params: keyOf(link),
    method: 'all',
  });

  return result.rows.length > 0;
}
