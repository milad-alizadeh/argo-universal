import { z } from 'zod';
import { SessionSnapshot } from '../sessions/snapshot';
import { SessionUpdate } from './session-update';

// The point an App has synced to; `null` asks for everything (ADR-0007).
export const FeedSyncPoint = z.strictObject({
  epoch: z.int().nonnegative(),
  revision: z.int().nonnegative(),
});
export type FeedSyncPoint = z.infer<typeof FeedSyncPoint>;

export const FeedSubscribeInput = z.strictObject({
  sessionId: z.string().min(1),
  after: FeedSyncPoint.nullable(),
});
export type FeedSubscribeInput = z.infer<typeof FeedSubscribeInput>;

// A whole row, new or changed.
export const RowUpsert = z.strictObject({
  type: z.literal('row.upsert'),
  rev: z.int().nonnegative(),
  row: SessionUpdate,
});
export type RowUpsert = z.infer<typeof RowUpsert>;

// Text appended to one field of an open row; the App applies it only when `off` equals that field's length.
export const RowAppend = z.strictObject({
  type: z.literal('row.append'),
  rev: z.int().nonnegative(),
  id: z.string().min(1),
  field: z.string().min(1),
  off: z.int().nonnegative(),
  text: z.string(),
});
export type RowAppend = z.infer<typeof RowAppend>;

// Top-level fields of a row that changed.
export const RowPatch = z.strictObject({
  type: z.literal('row.patch'),
  rev: z.int().nonnegative(),
  id: z.string().min(1),
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
  epoch: z.int().nonnegative(),
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
