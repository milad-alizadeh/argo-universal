import type { Argo, StorageResult } from '@argo/plugin-kit';
import { list, text } from './json';

/*
 * What the Plugin keeps in its own storage: the Atlassian sites it has found, and each Argo Project's choice of site
 * and Jira project. A Loader reads them as storage Queries, so a write here draws the pages that show them again.
 */
export type JiraSite = { cloudId: string; host: string };

export type ProjectChoice = {
  cloudId: string | null;
  project: { key: string; name: string } | null;
};

type Statement = { sql: string; params: (string | null)[] };

const tables = [
  'CREATE TABLE IF NOT EXISTS sites (cloud_id TEXT PRIMARY KEY, host TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS choices (project_id TEXT PRIMARY KEY, cloud_id TEXT, project_key TEXT, project_name TEXT)',
];

const run = (argo: Pick<Argo, 'storage'>, { sql, params }: Statement) =>
  argo.storage.execute({ sql, params, method: 'run' });

// Storage Queries open read-only, so the tables exist before any page reads them.
export async function createTables(argo: Pick<Argo, 'storage'>): Promise<void> {
  for (const sql of tables) await run(argo, { sql, params: [] });
}

const read = (sql: string, params: string[] = []) => ({
  api: 'storage' as const,
  queries: [{ sql, params, method: 'all' as const }],
});

export const storeQueries = {
  sites: read('SELECT cloud_id, host FROM sites ORDER BY host'),
  choice: (projectId: string) =>
    read(
      'SELECT cloud_id, project_key, project_name FROM choices WHERE project_id = ?',
      [projectId],
    ),
};

const rowsOf = (results: StorageResult[]): unknown[] => list(results[0]?.rows);

// A row is its columns' values, in the order the SELECT names them.
const column = (row: unknown, index: number): string | null =>
  text(list(row)[index]);

function siteOf(row: unknown): JiraSite | null {
  const cloudId = column(row, 0);
  const host = column(row, 1);

  return cloudId && host ? { cloudId, host } : null;
}

export const storeReaders = {
  sites: (results: StorageResult[]): JiraSite[] =>
    rowsOf(results)
      .map(siteOf)
      .filter((site) => site !== null),
  choice: (results: StorageResult[]): ProjectChoice => {
    const row = rowsOf(results)[0];
    const key = column(row, 1);

    return {
      cloudId: column(row, 0),
      project: key ? { key, name: column(row, 2) ?? key } : null,
    };
  },
};

// A site found again keeps its row; its host may have been renamed.
export const keepSite = (argo: Pick<Argo, 'storage'>, site: JiraSite) =>
  run(argo, {
    sql: 'INSERT INTO sites (cloud_id, host) VALUES (?, ?) ON CONFLICT (cloud_id) DO UPDATE SET host = excluded.host',
    params: [site.cloudId, site.host],
  });

// Choosing a site forgets the Jira project, which belongs to the site chosen before.
export const chooseSite = (
  argo: Pick<Argo, 'storage'>,
  projectId: string,
  cloudId: string,
) =>
  run(argo, {
    sql: 'INSERT INTO choices (project_id, cloud_id) VALUES (?, ?) ON CONFLICT (project_id) DO UPDATE SET cloud_id = excluded.cloud_id, project_key = NULL, project_name = NULL',
    params: [projectId, cloudId],
  });

export const chooseProject = (
  argo: Pick<Argo, 'storage'>,
  projectId: string,
  choice: { cloudId: string; key: string; name: string },
) =>
  run(argo, {
    sql: 'INSERT INTO choices (project_id, cloud_id, project_key, project_name) VALUES (?, ?, ?, ?) ON CONFLICT (project_id) DO UPDATE SET cloud_id = excluded.cloud_id, project_key = excluded.project_key, project_name = excluded.project_name',
    params: [projectId, choice.cloudId, choice.key, choice.name],
  });

// The site stays chosen, so the page asks only which of its Jira projects to show.
export const forgetProject = (argo: Pick<Argo, 'storage'>, projectId: string) =>
  run(argo, {
    sql: 'UPDATE choices SET project_key = NULL, project_name = NULL WHERE project_id = ?',
    params: [projectId],
  });
