import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.markSeen`: the newest Feed revision an App showed with the Feed's end on screen.
export const SessionMarkSeenInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  revision: sessionColumns.shape.seenRevision,
});
export type SessionMarkSeenInput = z.infer<typeof SessionMarkSeenInput>;

export const SessionMarkSeenOutput = z.strictObject({});
export type SessionMarkSeenOutput = z.infer<typeof SessionMarkSeenOutput>;
