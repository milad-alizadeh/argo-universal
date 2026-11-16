import {
  all,
  eventKey,
  isCountRow,
  isNameRow,
  keyOf,
  run,
  where,
  type Execute,
  type FixStore,
} from './pull-fix-rows';

export const insertEvent = (sent: number): string =>
  `INSERT INTO pull_auto_fix_events (project_id, session_id, repository, number, head, event_key, sent) VALUES (?, ?, ?, ?, ?, ?, ${sent}) ON CONFLICT DO NOTHING`;

export const seenOf =
  (execute: Execute): FixStore['seen'] =>
  async (link, head) => {
    const { rows } = await execute(
      all(
        `SELECT event_key FROM pull_auto_fix_events WHERE ${where} AND head = ?`,
        [...keyOf(link), head],
      ),
    );

    return new Set(rows.filter(isNameRow).map(([key]) => key));
  };

export const sentOf =
  (execute: Execute): FixStore['sent'] =>
  async (link, head) => {
    const { rows } = await execute(
      all(
        `SELECT COUNT(*) FROM pull_auto_fix_events WHERE ${where} AND head = ? AND sent = 1`,
        [...keyOf(link), head],
      ),
    );

    return rows.find(isCountRow)?.[0] ?? 0;
  };

export const recordedBy =
  (execute: Execute): FixStore['record'] =>
  async (link, head, check) => {
    await execute(run(insertEvent(1), [...keyOf(link), head, eventKey(check)]));
  };

export const unrecordedBy =
  (execute: Execute): FixStore['unrecord'] =>
  async (link, head, check) => {
    await execute(
      run(
        `DELETE FROM pull_auto_fix_events WHERE ${where} AND head = ? AND event_key = ?`,
        [...keyOf(link), head, eventKey(check)],
      ),
    );
  };
