import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionInfo } from './list';

// Global changes let Apps move rows between Active and Archived lists.
export const SessionListUpdate = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('changed'), session: SessionInfo }),
  z.strictObject({
    type: z.literal('removed'),
    sessionId: sessionColumns.shape.id,
  }),
]);
export type SessionListUpdate = z.infer<typeof SessionListUpdate>;
