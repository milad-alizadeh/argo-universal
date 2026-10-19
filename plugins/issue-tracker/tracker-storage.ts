import type { Argo, StorageQuery, StorageResult } from '@argo/plugin-kit';
import type { Issue, TrackerStorage } from './issue-types';

type Store = {
  argo: Argo;
  trackerExists: (id: string) => boolean;
  ensureTables: () => Promise<StorageResult[]>;
};

export function createTrackerStorage(
  argo: Argo,
  trackerExists: Store['trackerExists'],
): TrackerStorage {
  const store = { argo, trackerExists, ensureTables: createTables(argo) };

  return {
    selectedTracker: (projectId) => selectedTracker(store, projectId),
    chooseTracker: (projectId, id) => chooseTracker(store, projectId, id),
    readCache: (projectId) => readCache(store, projectId),
    writeCache: (projectId, issues) => writeCache(store, projectId, issues),
    updateCache: (projectId, issue) => updateCache(store, projectId, issue),
  };
}

const tableStatements = [
  'CREATE TABLE IF NOT EXISTS tracker_preferences (project_id TEXT PRIMARY KEY, tracker_id TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS issue_cache (project_id TEXT PRIMARY KEY, issues TEXT NOT NULL)',
];

function createTables(argo: Argo): Store['ensureTables'] {
  let tables: Promise<StorageResult[]> | undefined;

  const run = (sql: string): Promise<StorageResult> =>
    query(argo, { sql, params: [], method: 'run' });

  return () => {
    tables ??= Promise.all(tableStatements.map((sql) => run(sql)));

    return tables;
  };
}

async function selectedTracker(
  store: Store,
  projectId: string,
): Promise<string | null> {
  await store.ensureTables();

  const result = await query(store.argo, {
    sql: 'SELECT tracker_id FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return validSelection(store, storedText(result), projectId);
}

async function validSelection(
  store: Store,
  stored: string | null,
  projectId: string,
): Promise<string | null> {
  if (stored === null || store.trackerExists(stored)) return stored;

  await removeSelection(store.argo, projectId);

  return null;
}

async function chooseTracker(
  store: Store,
  projectId: string,
  id: string | null,
): Promise<void> {
  await store.ensureTables();

  if (id === null) return removeSelection(store.argo, projectId);

  if (!store.trackerExists(id)) throw new Error('Unknown Issue tracker.');

  await persistSelection(store.argo, projectId, id);
}

async function persistSelection(
  argo: Argo,
  projectId: string,
  id: string,
): Promise<void> {
  await query(argo, {
    sql: 'INSERT INTO tracker_preferences (project_id, tracker_id) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET tracker_id = excluded.tracker_id',
    params: [projectId, id],
    method: 'run',
  });
}

async function readCache(
  store: Store,
  projectId: string,
): Promise<Issue[] | null> {
  await store.ensureTables();

  const result = await query(store.argo, {
    sql: 'SELECT issues FROM issue_cache WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return decodeIssues(storedText(result));
}

async function writeCache(
  store: Store,
  projectId: string,
  issues: Issue[],
): Promise<void> {
  await store.ensureTables();

  await query(store.argo, {
    sql: 'INSERT INTO issue_cache (project_id, issues) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET issues = excluded.issues',
    params: [projectId, JSON.stringify(issues)],
    method: 'run',
  });
}

async function updateCache(
  store: Store,
  projectId: string,
  issue: Issue,
): Promise<void> {
  const cached = (await readCache(store, projectId)) ?? [];

  const updated = cached.map((entry) =>
    entry.number === issue.number ? issue : entry,
  );

  await writeCache(store, projectId, updated);
}

async function removeSelection(argo: Argo, projectId: string): Promise<void> {
  await query(argo, {
    sql: 'DELETE FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'run',
  });
}

const query = (argo: Argo, sql: StorageQuery): Promise<StorageResult> =>
  argo.storage.execute(sql);

// A `get` answers its one column's value, which SQLite stores as text.
function storedText(result: StorageResult): string | null {
  const [row] = result.rows;

  return isText(row) ? row : null;
}

const isText = (row: unknown): row is string => typeof row === 'string';

function decodeIssues(serialized: string | null): Issue[] | null {
  if (serialized === null) return null;

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}
