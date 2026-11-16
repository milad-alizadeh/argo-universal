import type { StorageResult } from '@argo/plugin-kit';
import { executingOver, type Storage } from './pull-execute';
import {
  all,
  keyOf,
  run,
  where,
  type Execute,
  type Link,
} from './pull-fix-rows';

export type ArchiveStore = {
  // Every pull request of these Sessions that has Auto-archive on.
  forSessions: (sessionIds: readonly string[]) => Promise<Link[]>;
  // Every pull request of a Project that has Auto-archive on.
  enabledIn: (projectId: string) => Promise<Link[]>;
  enable: (link: Link) => Promise<void>;
  disable: (link: Link) => Promise<void>;
};

// One row per Session per pull request the person has turned Auto-archive on for; off is no row.
const table =
  'CREATE TABLE IF NOT EXISTS pull_auto_archive (project_id TEXT NOT NULL, session_id TEXT NOT NULL, repository TEXT NOT NULL, number INTEGER NOT NULL, PRIMARY KEY (project_id, session_id, repository, number))';

const select =
  'SELECT project_id, session_id, repository, number FROM pull_auto_archive WHERE';

type Row = [string, string, string, number];

const rowWidth = 4;

const isRow = (row: unknown): row is Row =>
  Array.isArray(row) &&
  row.length === rowWidth &&
  typeof row[rowWidth - 1] === 'number';

const linksOf = ({ rows }: StorageResult): Link[] =>
  rows.filter(isRow).map(([projectId, sessionId, repository, number]) => ({
    projectId,
    sessionId,
    repository,
    number,
  }));

const forSessionsOf =
  (execute: Execute): ArchiveStore['forSessions'] =>
  async (sessionIds) => {
    const marks = sessionIds.map(() => '?').join(', ');

    return linksOf(
      await execute(all(`${select} session_id IN (${marks})`, [...sessionIds])),
    );
  };

const enabledInOf =
  (execute: Execute): ArchiveStore['enabledIn'] =>
  async (projectId) =>
    linksOf(await execute(all(`${select} project_id = ?`, [projectId])));

const enableOf =
  (execute: Execute): ArchiveStore['enable'] =>
  async (link) => {
    await execute(
      run(
        'INSERT INTO pull_auto_archive (project_id, session_id, repository, number) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
        keyOf(link),
      ),
    );
  };

const disableOf =
  (execute: Execute): ArchiveStore['disable'] =>
  async (link) => {
    await execute(
      run(`DELETE FROM pull_auto_archive WHERE ${where}`, keyOf(link)),
    );
  };

export function createArchiveStore(argo: Storage): ArchiveStore {
  const execute = executingOver(argo, [table]);

  return {
    forSessions: forSessionsOf(execute),
    enabledIn: enabledInOf(execute),
    enable: enableOf(execute),
    disable: disableOf(execute),
  };
}
