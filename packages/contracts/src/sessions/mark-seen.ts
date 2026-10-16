import { z } from 'zod';
import { feedRowColumns, sessionColumns } from '../columns';

// Input of `session.markSeen`: the newest Feed revision an App showed at the end of the Feed.
export const SessionMarkSeenInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  revision: feedRowColumns.shape.revision,
});

export type SessionMarkSeenInput = z.infer<typeof SessionMarkSeenInput>;

export const SessionMarkSeenOutput = z.strictObject({});

export type SessionMarkSeenOutput = z.infer<typeof SessionMarkSeenOutput>;
