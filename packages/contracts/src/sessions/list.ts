import { session } from '@argo/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

// Input of `session.list`, after ACP `ListSessionsRequest`, filtered by Project instead of `cwd`.
export const SessionListInput = z.strictObject({
  projectId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
});
export type SessionListInput = z.infer<typeof SessionListInput>;

const sessionColumns = createSelectSchema(session);

// One Session in a list, after ACP `SessionInfo`: `session` columns under ACP names, times in Unix milliseconds.
export const SessionInfo = z.strictObject({
  sessionId: sessionColumns.shape.id,
  ...sessionColumns.pick({
    projectId: true,
    agent: true,
    parentSessionId: true,
  }).shape,
  cwd: sessionColumns.shape.checkoutPath,
  title: z.string().optional(),
  createdAt: sessionColumns.shape.createdAt,
  updatedAt: sessionColumns.shape.updatedAt,
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const SessionListOutput = z.strictObject({
  sessions: z.array(SessionInfo),
  nextCursor: z.string().min(1).nullable(),
});
export type SessionListOutput = z.infer<typeof SessionListOutput>;
