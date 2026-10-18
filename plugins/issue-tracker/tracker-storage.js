export function createTrackerStorage(argo, trackerExists) {
  const store = { argo, trackerExists, ensureTables: createTables(argo) };

  return {
    selectedTracker: (projectId) => selectedTracker(store, projectId),
    chooseTracker: (projectId, id) => chooseTracker(store, projectId, id),
    readCache: (projectId) => readCache(store, projectId),
    writeCache: (projectId, issues) => writeCache(store, projectId, issues),
    updateCache: (projectId, issue) => updateCache(store, projectId, issue),
  };
}

function createTables(argo) {
  let tables;
  const run = (sql) => query(argo, { sql, params: [], method: 'run' });

  return () => {
    tables ??= Promise.all([
      run(
        'CREATE TABLE IF NOT EXISTS tracker_preferences (project_id TEXT PRIMARY KEY, tracker_id TEXT NOT NULL)',
      ),
      run(
        'CREATE TABLE IF NOT EXISTS issue_cache (project_id TEXT PRIMARY KEY, issues TEXT NOT NULL)',
      ),
    ]);

    return tables;
  };
}

async function selectedTracker(store, projectId) {
  await store.ensureTables();

  const result = await query(store.argo, {
    sql: 'SELECT tracker_id FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return validSelection(store, result.rows[0] ?? null, projectId);
}

async function validSelection(store, stored, projectId) {
  if (stored === null || store.trackerExists(stored)) return stored;

  await removeSelection(store.argo, projectId);

  return null;
}

async function chooseTracker(store, projectId, id) {
  await store.ensureTables();

  if (id === null) return removeSelection(store.argo, projectId);

  if (!store.trackerExists(id)) throw new Error('Unknown Issue tracker.');

  await persistSelection(store.argo, projectId, id);
}

async function persistSelection(argo, projectId, id) {
  await query(argo, {
    sql: 'INSERT INTO tracker_preferences (project_id, tracker_id) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET tracker_id = excluded.tracker_id',
    params: [projectId, id],
    method: 'run',
  });
}

async function readCache(store, projectId) {
  await store.ensureTables();

  const result = await query(store.argo, {
    sql: 'SELECT issues FROM issue_cache WHERE project_id = ?',
    params: [projectId],
    method: 'get',
  });

  return decodeIssues(result.rows[0]);
}

async function writeCache(store, projectId, issues) {
  await store.ensureTables();

  await query(store.argo, {
    sql: 'INSERT INTO issue_cache (project_id, issues) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET issues = excluded.issues',
    params: [projectId, JSON.stringify(issues)],
    method: 'run',
  });
}

async function updateCache(store, projectId, issue) {
  const cached = (await readCache(store, projectId)) ?? [];

  const updated = cached.map((entry) =>
    entry.number === issue.number ? issue : entry,
  );

  await writeCache(store, projectId, updated);
}

async function removeSelection(argo, projectId) {
  await query(argo, {
    sql: 'DELETE FROM tracker_preferences WHERE project_id = ?',
    params: [projectId],
    method: 'run',
  });
}

const query = (argo, sql) => argo.storage.execute(sql);

function decodeIssues(serialized) {
  if (typeof serialized !== 'string') return null;

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}
