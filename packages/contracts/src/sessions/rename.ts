import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.rename`; the user's title takes precedence over Agent titles.
export const SessionRenameInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  title: sessionColumns.shape.title,
});

export type SessionRenameInput = z.infer<typeof SessionRenameInput>;

// What `session.rename` runs with: a Session that runs it and names no Session renames itself.
export const SessionRenameParams = SessionRenameInput.extend({
  sessionId: SessionRenameInput.shape.sessionId
    .optional()
    .describe('The Session; a Session that runs this renames itself.'),
});

export type SessionRenameParams = z.infer<typeof SessionRenameParams>;

export const SessionRenameOutput = z.strictObject({});

export type SessionRenameOutput = z.infer<typeof SessionRenameOutput>;
