import type { Argo, StorageResult } from '@argo/plugin-kit';
import {
  issueSessionsTable,
  sessionMethods,
  type IssueLink,
  type IssueSession,
} from './issue-sessions-store';

export type { IssueLink, IssueSession } from './issue-sessions-store';

// A page's last loaded data in a Project, by the page's own name: shown at once while it loads again.
type CacheKey = { projectId: string; view: string };

export type TrackerStorage = {
  selectedTracker: (projectId: string) => Promise<string | null>;
  chooseTracker: (projectId: string, id: string | null) => Promise<void>;
  // Only this Plugin writes the cache, so a read trusts what it stored.
  readCache: <Value>(key: CacheKey) => Promise<Value | null>;
  writeCache: <Value>(key: CacheKey, value: Value) => Promise<void>;
  // Connecting a Session to an Issue again leaves the first time it was attached.
  attachSession: (link: IssueLink) => Promise<void>;
  detachSession: (link: IssueLink) => Promise<void>;
  issueSessions: (
    issue: Omit<IssueLink, 'sessionId'>,
  ) => Promise<IssueSession[]>;
  // The Issues these Sessions are attached to, the most recent first.
  sessionLinks: (sessionIds: readonly string[]) => Promise<IssueLink[]>;
};

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
    readCache: (key) => readCache(store, key),
    writeCache: (key, value) => writeCache(store, key, value),
    ...sessionMethods(store),
  };
}

const tableStatements = [
  'CREATE TABLE IF NOT EXISTS tracker_preferences (project_id TEXT PRIMARY KEY, tracker_id TEXT NOT NULL)',
  'DROP TABLE IF EXISTS issue_cache',
  'CREATE TABLE IF NOT EXISTS view_cache (project_id TEXT NOT NULL, view TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (project_id, view))',
  issueSessionsTable,
];

function createTables(argo: Argo): Store['ensureTables'] {
  let tables: Promise<StorageResult[]> | undefined;

  const run = (sql: string): Promise<StorageResult> =>
    argo.storage.execute({ sql, params: [], method: 'run' });

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

  const result = await store.argo.storage.execute({
    sql: 'SELECT tracker_id FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return validSelection(store, result, projectId);
}

// A `get` answers its row's one column.
async function validSelection(
  store: Store,
  { rows: [stored = null] }: StorageResult,
  projectId: string,
): Promise<string | null> {
  if (kept(store, stored)) return stored;

  await removeSelection(store.argo, projectId);

  return null;
}

const kept = (store: Store, stored: unknown): stored is string | null =>
  stored === null ||
  (typeof stored === 'string' && store.trackerExists(stored));

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
  await argo.storage.execute({
    sql: 'INSERT INTO tracker_preferences (project_id, tracker_id) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET tracker_id = excluded.tracker_id',
    params: [projectId, id],
    method: 'run',
  });
}

async function readCache<Value>(
  store: Store,
  { projectId, view }: CacheKey,
): Promise<Value | null> {
  await store.ensureTables();

  const result = await store.argo.storage.execute({
    sql: 'SELECT value FROM view_cache WHERE project_id = ? AND view = ?',
    params: [projectId, view],
    method: 'get',
  });

  return decodeValue(result);
}

async function writeCache<Value>(
  store: Store,
  { projectId, view }: CacheKey,
  value: Value,
): Promise<void> {
  await store.ensureTables();

  await store.argo.storage.execute({
    sql: 'INSERT INTO view_cache (project_id, view, value) VALUES (?, ?, ?) ON CONFLICT(project_id, view) DO UPDATE SET value = excluded.value',
    params: [projectId, view, JSON.stringify(value)],
    method: 'run',
  });
}

async function removeSelection(argo: Argo, projectId: string): Promise<void> {
  await argo.storage.execute({
    sql: 'DELETE FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'run',
  });
}

function decodeValue<Value>({
  rows: [serialized],
}: StorageResult): Value | null {
  if (typeof serialized !== 'string') return null;

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}
