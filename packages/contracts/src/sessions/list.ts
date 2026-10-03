import { z } from 'zod';

// Input of `session.list`, after ACP `ListSessionsRequest`, filtered by Project instead of `cwd`.
export const SessionListInput = z.strictObject({
  projectId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
});
export type SessionListInput = z.infer<typeof SessionListInput>;

// One Session in a list, after ACP `SessionInfo`.
export const SessionInfo = z.strictObject({
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
  agent: z.string().min(1),
  parentSessionId: z.string().min(1).nullable(),
  cwd: z.string().min(1),
  title: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const SessionListOutput = z.strictObject({
  sessions: z.array(SessionInfo),
  nextCursor: z.string().min(1).nullable(),
});
export type SessionListOutput = z.infer<typeof SessionListOutput>;
