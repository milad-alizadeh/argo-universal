import { z } from 'zod';
import { feedRowColumns, sessionColumns } from '../columns';
import { SessionOpenError } from '../sessions/new';
import { SessionSnapshot } from '../sessions/snapshot';
import { FeedAppend, FeedPatch } from './change';
import { FeedPageOutput } from './page';
import { SessionUpdate } from './session-update';

// The point an App has synced to; `null` asks for everything (ADR-0007).
export const FeedSyncPoint = z.strictObject({
  epoch: sessionColumns.shape.epoch,
  revision: feedRowColumns.shape.revision,
});

export type FeedSyncPoint = z.infer<typeof FeedSyncPoint>;

// Not strict: a Server ignores a key it does not know, so a later App can ask for more without Servers built after this refusing it (ADR-0045). A Server built before this does refuse `lastEventId` and `tail`; the App opens such a Server again with `after` alone.
export const FeedSubscribeInput = z.object({
  sessionId: sessionColumns.shape.id,
  after: FeedSyncPoint.nullable(),
  // tRPC's resume point: the id of the last event an App received, which its client sends again after a reconnect (`epoch:revision`, see `feedEventId`). It stands in for `after` when its revision is higher.
  lastEventId: z.string().optional(),
  // An App with no rows for the Session asks to open with its newest rows and the snapshot, so it reads no `feed.page` first. An App from before this leaves it out.
  tail: z.boolean().optional(),
  // An App that reads `rows.upsert` asks for a catch-up in batches of rows. An App from before this leaves it out and is sent one `row.upsert` per row.
  batched: z.boolean().optional(),
});

export type FeedSubscribeInput = z.infer<typeof FeedSubscribeInput>;

// A whole row, new or changed.
export const RowUpsert = z.strictObject({
  type: z.literal('row.upsert'),
  rev: feedRowColumns.shape.revision,
  row: SessionUpdate,
});

export type RowUpsert = z.infer<typeof RowUpsert>;

// Rows of a catch-up, new or changed, oldest change first; `rev` is the last row's revision, so the event's id (`epoch:rev`) resumes after the whole batch. Sent only to an App that asked for `batched`.
export const RowsUpsert = z.strictObject({
  type: z.literal('rows.upsert'),
  rev: feedRowColumns.shape.revision,
  rows: z.array(SessionUpdate).min(1),
});

export type RowsUpsert = z.infer<typeof RowsUpsert>;

// Text appended to the string at `field`, a dotted path such as `content.0.text`; the App applies it only when `off` equals that string's length.
export const RowAppend = FeedAppend.extend({
  type: z.literal('row.append'),
  rev: feedRowColumns.shape.revision,
  off: z.int(),
});

export type RowAppend = z.infer<typeof RowAppend>;

// Top-level fields of a row that changed.
export const RowPatch = FeedPatch.extend({
  type: z.literal('row.patch'),
  rev: feedRowColumns.shape.revision,
});

export type RowPatch = z.infer<typeof RowPatch>;

export const FeedSnapshot = z.strictObject({
  type: z.literal('snapshot'),
  snapshot: SessionSnapshot,
});

export type FeedSnapshot = z.infer<typeof FeedSnapshot>;

// The Feed's newest rows (`defaultPageRows`): the first event of a subscription opened with `tail`.
export const FeedTail = z.strictObject({
  type: z.literal('tail'),
  page: FeedPageOutput,
});

export type FeedTail = z.infer<typeof FeedTail>;

// The Server rebuilt the Session's rows; the App drops its cache for the Session.
const FeedReset = z.strictObject({
  type: z.literal('reset'),
  epoch: sessionColumns.shape.epoch,
});

const FeedClosed = z.strictObject({
  type: z.literal('closed'),
  failure: z.string().nullable(),
  openError: SessionOpenError.optional(),
});

// One value that the `feed.subscribe` subscription sends.
export const FeedSubscribeOutput = z.discriminatedUnion('type', [
  RowUpsert,
  RowsUpsert,
  RowAppend,
  RowPatch,
  FeedSnapshot,
  FeedTail,
  FeedReset,
  FeedClosed,
]);

export type FeedSubscribeOutput = z.infer<typeof FeedSubscribeOutput>;

// The id `feed.subscribe` gives an event that moves an App's sync point; tRPC's client sends the newest back as `lastEventId` when its socket reconnects.
export const feedEventId = ({ epoch, revision }: FeedSyncPoint): string =>
  `${epoch}:${revision}`;

// The sync point a `lastEventId` names; null for an id this Server did not give.
export function syncPointOfEventId(id: string): FeedSyncPoint | null {
  const [epoch, revision, ...rest] = id.split(':').map(Number);

  if (rest.length > 0) return null;

  return FeedSyncPoint.safeParse({ epoch, revision }).data ?? null;
}
