import { z } from 'zod';
import { SessionUpdate } from './session-update';

// Input of `feed.page`: `tail` reads the newest rows, `before` reads rows older than `cursor` (a position).
export const FeedPageInput = z.strictObject({
  sessionId: z.string().min(1),
  direction: z.enum(['tail', 'before']),
  cursor: z.int().nonnegative().optional(),
  limit: z.int().min(1).max(200).default(40),
});
export type FeedPageInput = z.infer<typeof FeedPageInput>;

// Output of `feed.page`. `staleCursor` is true when the cursor belongs to an older epoch.
export const FeedPageOutput = z.strictObject({
  epoch: z.int().nonnegative(),
  maxRevision: z.int().nonnegative(),
  rows: z.array(SessionUpdate),
  hasOlder: z.boolean(),
  startCursor: z.int().nonnegative().nullable(),
  staleCursor: z.boolean(),
});
export type FeedPageOutput = z.infer<typeof FeedPageOutput>;
