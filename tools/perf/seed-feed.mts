import type { feedRow, turn } from '@repo/db/schema';
import { z } from 'zod';
import { copyRow, recordings, type RecordedRow } from './recorded-feed.mts';

const columnFields = new Set([
  'id',
  'sessionId',
  'position',
  'revision',
  'turnId',
  'state',
  'sessionUpdate',
]);

// A recorded row's fields that no column holds.
type RecordedPayload = Omit<RecordedRow, 'id' | 'sessionUpdate' | 'turnId'>;

const payloadOf = (row: RecordedRow): RecordedPayload =>
  Object.fromEntries(
    Object.entries(row).filter(([key]) => !columnFields.has(key)),
  );

export interface SeededFeed {
  turns: (typeof turn.$inferInsert)[];
  rows: (typeof feedRow.$inferInsert)[];
}

// One ended Turn for each Turn the rows belong to.
const endedTurns = (
  sessionId: string,
  rows: readonly RecordedRow[],
  now: number,
): SeededFeed['turns'] =>
  [...new Set(rows.flatMap((row) => row.turnId ?? []))].map((id) => ({
    id,
    sessionId,
    status: 'ended',
    stopReason: 'end_turn',
    startedAt: now - 1000,
    endedAt: now - 500,
  }));

const settledRow = (
  sessionId: string,
  row: RecordedRow,
  position: number,
): SeededFeed['rows'][number] => ({
  sessionId,
  position,
  id: row.id,
  sessionUpdate: row.sessionUpdate,
  revision: position,
  turnId: row.turnId,
  state: 'settled',
  payload: payloadOf(row),
  payloadVersion: 1,
});

// One prefix per copy of a recording, so a copied Turn keeps all of its rows.
const copiedRows = (
  recorded: readonly RecordedRow[][],
  copies: number,
): RecordedRow[] =>
  Array.from({ length: copies }, (_, copy) =>
    recorded.flatMap((rows, index) =>
      rows.map((row) => copyRow(row, `c${copy}r${index}-`)),
    ),
  ).flat();

export type FeedSize = { copies: number } | { rows: number };

function rowsOf(recorded: RecordedRow[][], size: FeedSize): RecordedRow[] {
  const perCopy = recorded.reduce((count, rows) => count + rows.length, 0);

  const copies =
    'copies' in size ? size.copies : Math.ceil(size.rows / perCopy);

  const copied = copiedRows(recorded, copies);

  return 'rows' in size ? copied.slice(-size.rows) : copied;
}

// Exact tiers retain the catalog's final message, and every copied identity remains distinct.
export async function seededFeed(
  sessionId: string,
  size: FeedSize,
  now: number,
): Promise<SeededFeed> {
  const copied = rowsOf(await recordings(), size);

  return {
    turns: endedTurns(sessionId, copied, now),
    rows: copied.map((row, index) => settledRow(sessionId, row, index + 1)),
  };
}

function oneRecordedFeed(
  sessionId: string,
  recorded: RecordedRow[],
  now: number,
): SeededFeed {
  const rows = recorded.map((row) => copyRow(row, `${sessionId}-`));

  return {
    turns: endedTurns(sessionId, rows, now),
    rows: rows.map((row, index) => settledRow(sessionId, row, index + 1)),
  };
}

export function combineFeeds(feeds: SeededFeed[]): SeededFeed {
  return {
    turns: feeds.flatMap((feed) => feed.turns),
    rows: feeds.flatMap((feed) => feed.rows),
  };
}

export async function shortRecordedFeeds(
  sessionIds: string[],
  now: number,
): Promise<SeededFeed> {
  const [first] = await recordings();

  if (!first) throw new Error('Recorded catalog needs a short Feed');

  return combineFeeds(sessionIds.map((id) => oneRecordedFeed(id, first, now)));
}

const messageKinds = new Set<string>([
  'user_message',
  'agent_thought',
  'agent_message',
]);

const textBlock = z.looseObject({ text: z.string().optional() });

const messagePayload = z.looseObject({ content: z.array(textBlock) });

type TextBlock = z.infer<typeof textBlock>;

const blankedBlock = (block: TextBlock): TextBlock =>
  block.text === undefined ? block : { ...block, text: '' };

// A message's text blocks with their text emptied; every other block and field stays.
function blankedPayload(
  payload: SeededFeed['rows'][number]['payload'],
): z.infer<typeof messagePayload> {
  const message = messagePayload.parse(payload);

  return { ...message, content: message.content.map(blankedBlock) };
}

/*
 * The recorded Feed with every prompt, thought and answer emptied of text, its Tool calls and compaction
 * rows left as recorded. The Session still has rows to draw, so it measures how the Feed lays out and
 * scrolls message rows that have nothing in them to size them by. A Feed of nothing but blank messages
 * is not this: the App draws a Session like that as an empty one, with no Feed to scroll.
 */
export async function blankedFeed(
  sessionId: string,
  size: FeedSize,
  now: number,
): Promise<SeededFeed> {
  const feed = await seededFeed(sessionId, size, now);

  return {
    turns: feed.turns,
    rows: feed.rows.map((row) =>
      messageKinds.has(row.sessionUpdate)
        ? { ...row, payload: blankedPayload(row.payload) }
        : row,
    ),
  };
}
