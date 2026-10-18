import { trackerExists } from './tracker-registry.js';

let argo;

export function configureTrackerStorage(api) {
  argo = api;
}

export async function selectedTracker(projectId) {
  await run(
    'CREATE TABLE IF NOT EXISTS tracker_preferences (project_id TEXT PRIMARY KEY, tracker_id TEXT NOT NULL)',
  );

  const result = await argo.storage.execute({
    sql: 'SELECT tracker_id FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return validSelection(projectId, result.rows[0] ?? null);
}

async function validSelection(projectId, stored) {
  if (stored !== null && !trackerExists(stored)) {
    await removeSelection(projectId);

    return null;
  }

  return stored;
}

export async function chooseTracker(projectId, id) {
  await run(
    'CREATE TABLE IF NOT EXISTS tracker_preferences (project_id TEXT PRIMARY KEY, tracker_id TEXT NOT NULL)',
  );

  if (id === null) return removeSelection(projectId);

  await argo.storage.execute({
    sql: 'INSERT INTO tracker_preferences (project_id, tracker_id) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET tracker_id = excluded.tracker_id',
    params: [projectId, id],
    method: 'run',
  });
}

export async function readCache(projectId) {
  await run(
    'CREATE TABLE IF NOT EXISTS issue_cache (project_id TEXT PRIMARY KEY, issues TEXT NOT NULL)',
  );

  const result = await argo.storage.execute({
    sql: 'SELECT issues FROM issue_cache WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return decodeIssues(result.rows[0]);
}

export async function writeCache(projectId, issues) {
  await run(
    'CREATE TABLE IF NOT EXISTS issue_cache (project_id TEXT PRIMARY KEY, issues TEXT NOT NULL)',
  );
  await argo.storage.execute({
    sql: 'INSERT INTO issue_cache (project_id, issues) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET issues = excluded.issues',
    params: [projectId, JSON.stringify(issues)],
    method: 'run',
  });
}

export async function updateCache(projectId, issue) {
  const cached = (await readCache(projectId)) ?? [];

  const updated = cached.map((entry) =>
    entry.number === issue.number ? issue : entry,
  );

  await writeCache(projectId, updated);
}

async function removeSelection(projectId) {
  await argo.storage.execute({
    sql: 'DELETE FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'run',
  });
}

const run = (sql) => argo.storage.execute({ sql, params: [], method: 'run' });

function decodeIssues(serialized) {
  if (typeof serialized !== 'string') return null;

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}
