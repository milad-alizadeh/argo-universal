import { z } from 'zod';
import { feedRowColumns, sessionColumns } from '../columns';
import { SessionUpdate } from './session-update';

// Input of `feed.page`: `tail` reads the newest rows, `before` reads rows older than `cursor` (a position) from `epoch`.
export const FeedPageInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  direction: z.enum(['tail', 'before']),
  cursor: feedRowColumns.shape.position.optional(),
  epoch: sessionColumns.shape.epoch.optional(),
  limit: z.int().min(1).max(200).default(40),
});
export type FeedPageInput = z.infer<typeof FeedPageInput>;

// Output of `feed.page`. `staleCursor` is true when the input's `epoch` is not the Session's; the page is then the tail.
export const FeedPageOutput = z.strictObject({
  epoch: sessionColumns.shape.epoch,
  maxRevision: sessionColumns.shape.maxRevision,
  rows: z.array(SessionUpdate),
  hasOlder: z.boolean(),
  startCursor: feedRowColumns.shape.position.nullable(),
  staleCursor: z.boolean(),
});
export type FeedPageOutput = z.infer<typeof FeedPageOutput>;
