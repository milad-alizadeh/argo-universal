import {
  all,
  commentPrefix,
  isNameRow,
  keyOf,
  run,
  where,
  type Execute,
  type FixStore,
} from './pull-fix-rows';

const insertEvent =
  'INSERT INTO pull_auto_fix_events (project_id, session_id, repository, number, head, event_key, sent) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT DO NOTHING';

export const seenOf =
  (execute: Execute): FixStore['seen'] =>
  async (link, head) => {
    const { rows } = await execute(
      all(
        `SELECT event_key FROM pull_auto_fix_events WHERE ${where} AND (head = ? OR event_key LIKE ?)`,
        [...keyOf(link), head, `${commentPrefix}%`],
      ),
    );

    return new Set(rows.filter(isNameRow).map(([key]) => key));
  };

export const recordedBy =
  (execute: Execute): FixStore['record'] =>
  async (link, head, keys) => {
    for (const key of keys)
      await execute(run(insertEvent, [...keyOf(link), head, key]));
  };

export const unrecordedBy =
  (execute: Execute): FixStore['unrecord'] =>
  async (link, head, keys) => {
    for (const key of keys)
      await execute(
        run(
          `DELETE FROM pull_auto_fix_events WHERE ${where} AND head = ? AND event_key = ?`,
          [...keyOf(link), head, key],
        ),
      );
  };
