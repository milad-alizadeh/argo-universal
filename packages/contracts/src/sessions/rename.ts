import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.rename`; the user's title takes precedence over Agent titles.
export const SessionRenameInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  title: sessionColumns.shape.title,
});
export type SessionRenameInput = z.infer<typeof SessionRenameInput>;

export const SessionRenameOutput = z.strictObject({});
export type SessionRenameOutput = z.infer<typeof SessionRenameOutput>;
