import { z } from 'zod';
import { SessionUpdate } from './session-update';

// Input of `feed.row`: fetch one row again, for example after a `row.append` gap.
export const FeedRowInput = z.strictObject({
  sessionId: z.string().min(1),
  id: z.string().min(1),
});
export type FeedRowInput = z.infer<typeof FeedRowInput>;

export const FeedRowOutput = SessionUpdate;
export type FeedRowOutput = z.infer<typeof FeedRowOutput>;
