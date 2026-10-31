import type { Argo, StorageResult } from '@argo/plugin-kit';

// A Session an Agent attached to one Issue, as the Issue's page lists it.
export type IssueSession = { sessionId: string; attachedAt: string };

// Which Issue a Session is working on, in which Project.
export type IssueLink = {
  projectId: string;
  number: number;
  sessionId: string;
};

// What the attachments need of the Plugin's store: its storage, with the tables in place.
export type SessionStore = {
  argo: Argo;
  ensureTables: () => Promise<StorageResult[]>;
};

// The table an attachment lives in; one row per Session per Issue.
export const issueSessionsTable =
  'CREATE TABLE IF NOT EXISTS issue_sessions (project_id TEXT NOT NULL, issue_number INTEGER NOT NULL, session_id TEXT NOT NULL, attached_at TEXT NOT NULL, PRIMARY KEY (project_id, issue_number, session_id))';

// Attaching twice is the same attachment, so the first time it happened stands.
export async function attachSession(
  store: SessionStore,
  { projectId, number, sessionId }: IssueLink,
): Promise<void> {
  await store.ensureTables();

  await store.argo.storage.execute({
    sql: 'INSERT INTO issue_sessions (project_id, issue_number, session_id, attached_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, issue_number, session_id) DO NOTHING',
    params: [projectId, number, sessionId, new Date().toISOString()],
    method: 'run',
  });
}

export async function detachSession(
  store: SessionStore,
  { projectId, number, sessionId }: IssueLink,
): Promise<void> {
  await store.ensureTables();

  await store.argo.storage.execute({
    sql: 'DELETE FROM issue_sessions WHERE project_id = ? AND issue_number = ? AND session_id = ?',
    params: [projectId, number, sessionId],
    method: 'run',
  });
}

// The Sessions attached to one Issue, the most recent first.
export async function issueSessions(
  store: SessionStore,
  { projectId, number }: Omit<IssueLink, 'sessionId'>,
): Promise<IssueSession[]> {
  await store.ensureTables();

  const result = await store.argo.storage.execute({
    sql: 'SELECT session_id, attached_at FROM issue_sessions WHERE project_id = ? AND issue_number = ? ORDER BY attached_at DESC',
    params: [projectId, number],
    method: 'all',
  });

  return attachedSessions(result);
}

// Each row is `[session_id, attached_at]`, as this Plugin's own INSERT wrote it; any other is left out.
const attachedSessions = ({ rows }: StorageResult): IssueSession[] =>
  rows.flatMap((row) =>
    isSessionRow(row) ? [{ sessionId: row[0], attachedAt: row[1] }] : [],
  );

const isSessionRow = (row: unknown): row is [string, string] =>
  Array.isArray(row) &&
  typeof row[0] === 'string' &&
  typeof row[1] === 'string';
