import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.open`: opens a stored Session without a Turn, as Retry after a failed open does.
export const SessionOpenInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export type SessionOpenInput = z.infer<typeof SessionOpenInput>;

export const SessionOpenOutput = z.strictObject({});

export type SessionOpenOutput = z.infer<typeof SessionOpenOutput>;
