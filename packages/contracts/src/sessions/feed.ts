import { z } from 'zod';
import { FeedPageInput } from '../feed/page';
import { AgentMessage } from '../feed/session-update';

// With no cursor this reads the newest Agent messages; a cursor reads older messages by position.
export const SessionFeedInput = FeedPageInput.pick({
  sessionId: true,
  cursor: true,
  epoch: true,
  limit: true,
});

export type SessionFeedInput = z.infer<typeof SessionFeedInput>;

// Messages keep Feed order within a page; `nextCursor` starts the next older page.
export const SessionFeedOutput = z.strictObject({
  epoch: FeedPageInput.shape.epoch.unwrap(),
  messages: z.array(AgentMessage),
  nextCursor: FeedPageInput.shape.cursor.unwrap().nullable(),
  staleCursor: z.boolean(),
});

export type SessionFeedOutput = z.infer<typeof SessionFeedOutput>;
