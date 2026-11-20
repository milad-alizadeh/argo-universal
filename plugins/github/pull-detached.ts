import type { Argo } from '@argo/plugin-kit';
import type { PullLink } from './pull-store';

// The statements of the detached marks (#2470): which pull requests the person took off a Session.

/*
 * One row per pull request detached from a Session, so a detach sticks: discovery never attaches it to that Session
 * again, and an Agent attaches it again only when the person asks (#2470). Attaching it clears the row.
 */
export const detachedTable =
  'CREATE TABLE IF NOT EXISTS pull_detached (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, detached_at TEXT NOT NULL, PRIMARY KEY (project_id, session_id, repository, number))';

const insertUnlessDetached =
  'INSERT INTO pull_associations (project_id, session_id, repository, number, attached_at) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM pull_detached d WHERE d.project_id = ?1 AND d.session_id = ?2 AND d.repository = ?3 AND d.number = ?4) ON CONFLICT(project_id, session_id, repository, number) DO NOTHING';

export const guardedInsertOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: insertUnlessDetached,
  params: [
    link.projectId,
    link.sessionId,
    link.repository.toLowerCase(),
    link.number,
    new Date().toISOString(),
  ],
  method: 'run',
});

export const keyParams = (link: PullLink): (string | number)[] => [
  link.projectId,
  link.sessionId,
  link.repository.toLowerCase(),
  link.number,
];

const markDetached =
  'INSERT INTO pull_detached (project_id, session_id, repository, number, detached_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id, session_id, repository, number) DO UPDATE SET detached_at = excluded.detached_at';

export const markOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: markDetached,
  params: [...keyParams(link), new Date().toISOString()],
  method: 'run',
});

export const unmarkOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: 'DELETE FROM pull_detached WHERE project_id = ? AND session_id = ? AND repository = ? AND number = ?',
  params: keyParams(link),
  method: 'run',
});

export const markedOf = (
  link: PullLink,
): Parameters<Argo['storage']['execute']>[0] => ({
  sql: 'SELECT 1 FROM pull_detached WHERE project_id = ? AND session_id = ? AND repository = ? AND number = ?',
  params: keyParams(link),
  method: 'all',
});

// Each statement waits for the table, then runs.
