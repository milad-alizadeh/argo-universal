import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionSnapshot } from './snapshot';

export const SessionGetInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export type SessionGetInput = z.infer<typeof SessionGetInput>;

export const SessionGetOutput = SessionSnapshot;

export type SessionGetOutput = z.infer<typeof SessionGetOutput>;
