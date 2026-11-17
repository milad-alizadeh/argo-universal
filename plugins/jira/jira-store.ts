import type { Argo, StorageResult } from '@argo/plugin-kit';
import { isJson, list, present, text, type Json } from './json';

/*
 * What the Plugin keeps in its own storage: the Atlassian sites it has found, and each Argo Project's choice of site
 * and Jira project. A Loader reads them as storage Queries, so a write here draws the pages that show them again.
 */
export type JiraSite = { cloudId: string; host: string };

export type ProjectChoice = {
  cloudId: string | null;
  project: { key: string; name: string } | null;
};

type Storage = Pick<Argo, 'storage'>;

type Statement = { sql: string; params: (string | null)[] };

const tables = [
  'CREATE TABLE IF NOT EXISTS sites (cloud_id TEXT PRIMARY KEY, host TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS choices (project_id TEXT PRIMARY KEY, cloud_id TEXT, project_key TEXT, project_name TEXT)',
];

const run = (
  argo: Storage,
  { sql, params }: Statement,
): Promise<StorageResult> =>
  argo.storage.execute({ sql, params, method: 'run' });

// Storage Queries open read-only, so the tables exist before any page reads them.
export async function createTables(argo: Storage): Promise<void> {
  for (const sql of tables) await run(argo, { sql, params: [] });
}

type StorageRead = {
  api: 'storage';
  queries: { sql: string; params: string[]; method: 'all' }[];
};

const read = (sql: string, params: string[] = []): StorageRead => ({
  api: 'storage',
  queries: [{ sql, params, method: 'all' }],
});

export const storeQueries = {
  sites: read('SELECT cloud_id, host FROM sites ORDER BY host'),
  choice: (projectId: string): StorageRead =>
    read(
      'SELECT cloud_id, project_key, project_name FROM choices WHERE project_id = ?',
      [projectId],
    ),
};

// A row is its columns' values, in the order the SELECT names them.
const rowsOf = (results: StorageResult[]): Json[][] =>
  list((results.at(0)?.rows ?? []).filter(isJson)).map(list);

const column = (row: Json[] | undefined, index: number): string | null =>
  text(row?.at(index));

function siteOf(row: Json[]): JiraSite | null {
  const cloudId = column(row, 0);
  const host = column(row, 1);

  return cloudId && host ? { cloudId, host } : null;
}

function choiceOf(row: Json[] | undefined): ProjectChoice {
  const key = column(row, 1);

  return {
    cloudId: column(row, 0),
    project: key ? { key, name: column(row, 2) ?? key } : null,
  };
}

export const storeReaders = {
  sites: (results: StorageResult[]): JiraSite[] =>
    rowsOf(results).map(siteOf).filter(present),
  choice: (results: StorageResult[]): ProjectChoice =>
    choiceOf(rowsOf(results).at(0)),
};

// A site found again keeps its row; its host may have been renamed.
export const keepSite = (
  argo: Storage,
  site: JiraSite,
): Promise<StorageResult> =>
  run(argo, {
    sql: 'INSERT INTO sites (cloud_id, host) VALUES (?, ?) ON CONFLICT (cloud_id) DO UPDATE SET host = excluded.host',
    params: [site.cloudId, site.host],
  });

// Choosing a site forgets the Jira project, which belongs to the site chosen before.
export const chooseSite = (
  argo: Storage,
  { projectId, cloudId }: { projectId: string; cloudId: string },
): Promise<StorageResult> =>
  run(argo, {
    sql: 'INSERT INTO choices (project_id, cloud_id) VALUES (?, ?) ON CONFLICT (project_id) DO UPDATE SET cloud_id = excluded.cloud_id, project_key = NULL, project_name = NULL',
    params: [projectId, cloudId],
  });

export type JiraProjectChoice = {
  projectId: string;
  cloudId: string;
  key: string;
  name: string;
};

export const chooseProject = (
  argo: Storage,
  choice: JiraProjectChoice,
): Promise<StorageResult> =>
  run(argo, {
    sql: 'INSERT INTO choices (project_id, cloud_id, project_key, project_name) VALUES (?, ?, ?, ?) ON CONFLICT (project_id) DO UPDATE SET cloud_id = excluded.cloud_id, project_key = excluded.project_key, project_name = excluded.project_name',
    params: [choice.projectId, choice.cloudId, choice.key, choice.name],
  });

// The site stays chosen, so the page asks only which of its Jira projects to show.
export const forgetProject = (
  argo: Storage,
  projectId: string,
): Promise<StorageResult> =>
  run(argo, {
    sql: 'UPDATE choices SET project_key = NULL, project_name = NULL WHERE project_id = ?',
    params: [projectId],
  });
