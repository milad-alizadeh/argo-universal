import { z } from 'zod';
import { feedRowColumns, sessionColumns } from '../columns';
import { SessionSnapshot } from '../sessions/snapshot';
import { SessionUpdate } from './session-update';

// The point an App has synced to; `null` asks for everything (ADR-0007).
export const FeedSyncPoint = z.strictObject({
  epoch: sessionColumns.shape.epoch,
  revision: feedRowColumns.shape.revision,
});
export type FeedSyncPoint = z.infer<typeof FeedSyncPoint>;

export const FeedSubscribeInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  after: FeedSyncPoint.nullable(),
});
export type FeedSubscribeInput = z.infer<typeof FeedSubscribeInput>;

// A whole row, new or changed.
export const RowUpsert = z.strictObject({
  type: z.literal('row.upsert'),
  rev: feedRowColumns.shape.revision,
  row: SessionUpdate,
});
export type RowUpsert = z.infer<typeof RowUpsert>;

// Text appended to one field of an open row; the App applies it only when `off` equals that field's length.
export const RowAppend = z.strictObject({
  type: z.literal('row.append'),
  rev: feedRowColumns.shape.revision,
  id: feedRowColumns.shape.id,
  field: z.string(),
  off: z.int(),
  text: z.string(),
});
export type RowAppend = z.infer<typeof RowAppend>;

// Top-level fields of a row that changed.
export const RowPatch = z.strictObject({
  type: z.literal('row.patch'),
  rev: feedRowColumns.shape.revision,
  id: feedRowColumns.shape.id,
  set: z.record(z.string(), z.unknown()),
});
export type RowPatch = z.infer<typeof RowPatch>;

export const FeedSnapshot = z.strictObject({
  type: z.literal('snapshot'),
  snapshot: SessionSnapshot,
});
export type FeedSnapshot = z.infer<typeof FeedSnapshot>;

// The Server rebuilt the Session's rows; the App drops its cache for the Session.
export const FeedReset = z.strictObject({
  type: z.literal('reset'),
  epoch: sessionColumns.shape.epoch,
});
export type FeedReset = z.infer<typeof FeedReset>;

// One value that the `feed.subscribe` subscription sends.
export const FeedSubscribeOutput = z.discriminatedUnion('type', [
  RowUpsert,
  RowAppend,
  RowPatch,
  FeedSnapshot,
  FeedReset,
]);
export type FeedSubscribeOutput = z.infer<typeof FeedSubscribeOutput>;
