import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { recordedFeedMocks } from '@repo/mocks/app';
import { beforeEach, expect, it, onTestFinished } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

// The `feed_row` layout every Server has written since payload version 1: the envelope in columns, the rest as JSON.
const insertStoredRow = (database: Database, row: SessionUpdate): void => {
  const {
    id,
    sessionId,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    ...payload
  } = row;
  database.$client
    .prepare(
      `INSERT INTO feed_row (session_id, position, id, session_update, revision, turn_id, state, payload, payload_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      sessionId,
      position,
      id,
      sessionUpdate,
      revision,
      turnId,
      state,
      JSON.stringify(payload),
    );
};

const storeRecording = (
  database: Database,
  rows: readonly SessionUpdate[],
): void => {
  const [first] = rows;
  if (!first) return;
  insertSession(database, {
    id: first.sessionId,
    maxRevision: Math.max(...rows.map((row): number => row.revision)),
  });
  for (const row of rows) insertStoredRow(database, row);
};

const readRecordedSessionId = (rows: readonly SessionUpdate[]): string => {
  const [first] = rows;
  if (!first) throw new Error('A recording without rows');
  return first.sessionId;
};

let caller: Awaited<ReturnType<typeof startEngineTestHost>>['caller'];

beforeEach(async (): Promise<void> => {
  const storage = openTestDatabase();
  onTestFinished(storage.remove);
  for (const { rows } of recordedFeedMocks)
    storeRecording(storage.database, rows);
  ({ caller } = await startEngineTestHost({ database: storage.database }));
});

it.each(recordedFeedMocks)(
  'pages $agent $recording history stored before ACP as it was recorded',
  async ({ rows }): Promise<void> => {
    const page = await caller.feed.page({
      sessionId: readRecordedSessionId(rows),
      direction: 'tail',
      limit: 200,
    });

    expect(page.rows).toEqual(rows);
  },
);

it.each(recordedFeedMocks)(
  'catches up $agent $recording history stored before ACP from its first revision',
  async ({ rows }): Promise<void> => {
    const updates = (
      await caller.feed.subscribe({
        sessionId: readRecordedSessionId(rows),
        after: { epoch: 0, revision: 0 },
      })
    )[Symbol.asyncIterator]();
    const received: SessionUpdate[] = [];

    while (received.length < rows.length) {
      const { value } = await updates.next();
      if (value?.type === 'row.upsert') received.push(value.row);
    }
    await updates.return?.();

    expect(received).toEqual(
      rows.toSorted((a, b): number => a.revision - b.revision),
    );
  },
);
