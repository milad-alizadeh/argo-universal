import { executingOver, type Storage } from './pull-execute';
import { recordedBy, seenOf, unrecordedBy } from './pull-fix-events';
import {
  all,
  columns,
  keyOf,
  recordsOf,
  run,
  tables,
  where,
  type Execute,
  type FixStore,
  type Link,
} from './pull-fix-rows';
import { clearedOn, sentOf, sentWritersOf, waitingOf } from './pull-fix-sent';

export type { FixRecord, FixStore } from './pull-fix-rows';

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
  async (link, head) => {
    await set(link, 1, null);
    await execute(
      run(
        `DELETE FROM pull_auto_fix_events WHERE ${where} AND (head = ? OR sent = 0)`,
        [...keyOf(link), head],
      ),
    );
    await clearedOn(execute, link, head);
  };

const forgetOf =
  (execute: Execute): FixStore['forget'] =>
  async (link) => {
    // Keep the first-enable receipt even when this pull request is detached.
    await execute(
      run(
        `UPDATE pull_auto_fix SET enabled = 0, stop_head = NULL WHERE ${where}`,
        keyOf(link),
      ),
    );
    await execute(
      run(`DELETE FROM pull_auto_fix_events WHERE ${where}`, keyOf(link)),
    );
    await execute(
      run(`DELETE FROM pull_auto_fix_prompts WHERE ${where}`, keyOf(link)),
    );
  };

const readingOf = (
  execute: Execute,
): Pick<
  FixStore,
  'forSessions' | 'enabledIn' | 'seen' | 'sent' | 'waiting'
> => ({
  forSessions: forSessionsOf(execute),
  enabledIn: enabledInOf(execute),
  seen: seenOf(execute),
  sent: sentOf(execute),
  waiting: waitingOf(execute),
});

const writingOf = (
  execute: Execute,
): Omit<FixStore, keyof ReturnType<typeof readingOf>> => {
  const set = setterOf(execute);

  return {
    record: recordedBy(execute),
    unrecord: unrecordedBy(execute),
    ...sentWritersOf(execute),
    enable: enableOf(execute, set),
    enableFirst: async (link) => {
      await execute(
        run(
          'INSERT INTO pull_auto_fix (project_id, session_id, repository, number, enabled, stop_head) VALUES (?, ?, ?, ?, 1, NULL) ON CONFLICT DO NOTHING',
          keyOf(link),
        ),
      );
    },
    disable: (link) => set(link, 0, null),
    stop: (link, head) => set(link, 0, head),
    forget: forgetOf(execute),
  };
};

export function createFixStore(argo: Storage): FixStore {
  const execute = executingOver(argo, tables);

  return { ...readingOf(execute), ...writingOf(execute) };
}
