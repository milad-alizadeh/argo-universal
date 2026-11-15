import type { Argo } from '@argo/plugin-kit';
import {
  insertEvent,
  recordedBy,
  seenOf,
  sentOf,
  unrecordedBy,
} from './pull-fix-events';
import {
  all,
  columns,
  eventKey,
  keyOf,
  recordsOf,
  run,
  tables,
  where,
  type Execute,
  type FixStore,
  type Link,
} from './pull-fix-rows';

export type { FixRecord, FixStore } from './pull-fix-rows';

// The Plugin's own storage, as the Auto-fix records use it.
type Storage = Pick<Argo, 'storage'>;

type SetRecord = (
  link: Link,
  enabled: number,
  stopHead: string | null,
) => Promise<void>;

const upsert =
  'INSERT INTO pull_auto_fix (project_id, session_id, repository, number, enabled, stop_head) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(project_id, session_id, repository, number) DO UPDATE SET enabled = excluded.enabled, stop_head = excluded.stop_head';

const setterOf =
  (execute: Execute): SetRecord =>
  async (link, enabled, stopHead) => {
    await execute(run(upsert, [...keyOf(link), enabled, stopHead]));
  };

const selectRecords = (condition: string): string =>
  `SELECT ${columns} FROM pull_auto_fix WHERE ${condition}`;

const forSessionsOf =
  (execute: Execute): FixStore['forSessions'] =>
  async (sessionIds) => {
    const marks = sessionIds.map(() => '?').join(', ');
    const sql = selectRecords(`session_id IN (${marks})`);

    return recordsOf(await execute(all(sql, [...sessionIds])));
  };

const enabledInOf =
  (execute: Execute): FixStore['enabledIn'] =>
  async (projectId) =>
    recordsOf(
      await execute(
        all(selectRecords('project_id = ? AND enabled = 1'), [projectId]),
      ),
    );

const enableOf =
  (execute: Execute, set: SetRecord): FixStore['enable'] =>
  async (link, head, failed) => {
    await set(link, 1, null);
    await execute(
      run(
        `UPDATE pull_auto_fix_events SET sent = 0 WHERE ${where} AND head = ?`,
        [...keyOf(link), head],
      ),
    );

    for (const check of failed)
      await execute(
        run(insertEvent(0), [...keyOf(link), head, eventKey(check)]),
      );
  };

const forgetOf =
  (execute: Execute): FixStore['forget'] =>
  async (link) => {
    await execute(run(`DELETE FROM pull_auto_fix WHERE ${where}`, keyOf(link)));
    await execute(
      run(`DELETE FROM pull_auto_fix_events WHERE ${where}`, keyOf(link)),
    );
  };

// Each statement waits for both tables, then runs.
function executing({ storage }: Storage): Execute {
  let ready: Promise<unknown> | undefined;

  return async (statement) => {
    ready ??= Promise.all(tables.map((sql) => storage.execute(run(sql, []))));
    await ready;

    return storage.execute(statement);
  };
}

const readingOf = (
  execute: Execute,
): Pick<FixStore, 'forSessions' | 'enabledIn' | 'seen' | 'sent'> => ({
  forSessions: forSessionsOf(execute),
  enabledIn: enabledInOf(execute),
  seen: seenOf(execute),
  sent: sentOf(execute),
});

const writingOf = (
  execute: Execute,
): Omit<FixStore, keyof ReturnType<typeof readingOf>> => {
  const set = setterOf(execute);

  return {
    record: recordedBy(execute),
    unrecord: unrecordedBy(execute),
    enable: enableOf(execute, set),
    disable: (link) => set(link, 0, null),
    stop: (link, head) => set(link, 0, head),
    forget: forgetOf(execute),
  };
};

export function createFixStore(argo: Storage): FixStore {
  const execute = executing(argo);

  return { ...readingOf(execute), ...writingOf(execute) };
}
