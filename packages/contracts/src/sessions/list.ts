import { z } from 'zod';
import { sessionColumns } from '../columns';
import { CheckoutChoice } from './new';

// Input of `session.list`, after ACP `ListSessionsRequest`, filtered by Project instead of `cwd`.
export const SessionListInput = z.strictObject({
  projectId: sessionColumns.shape.projectId.optional(),
  archived: z.boolean(),
  query: z.string().optional(),
  cursor: z.string().optional(),
  direction: z.literal('forward').optional(),
});
export type SessionListInput = z.infer<typeof SessionListInput>;

export const SessionStatus = z.enum([
  'needs_input',
  'running',
  'failed',
  'unread',
  'idle',
]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionTitleSource = sessionColumns.shape.titleSource;
export type SessionTitleSource = z.infer<typeof SessionTitleSource>;

export const SessionCheckout = z.strictObject({
  type: CheckoutChoice,
  path: sessionColumns.shape.checkoutPath,
  branch: sessionColumns.shape.checkoutBranch,
});
export type SessionCheckout = z.infer<typeof SessionCheckout>;

export const SessionWorkCount = z.strictObject({
  running: z.int(),
  total: z.int(),
});
export type SessionWorkCount = z.infer<typeof SessionWorkCount>;

// One Session in a list, after ACP `SessionInfo`: `session` columns under ACP names, times in Unix milliseconds.
export const SessionInfo = z.strictObject({
  ...sessionColumns.pick({
    projectId: true,
    agent: true,
    parentSessionId: true,
    createdAt: true,
    updatedAt: true,
  }).shape,
  sessionId: sessionColumns.shape.id,
  cwd: sessionColumns.shape.checkoutPath,
  status: SessionStatus,
  title: sessionColumns.shape.title,
  titleSource: SessionTitleSource,
  activity: z.string(),
  activityAt: sessionColumns.shape.activityAt,
  checkout: SessionCheckout,
  plan: z.strictObject({ done: z.int(), total: z.int() }).nullable(),
  subagents: SessionWorkCount,
  shells: SessionWorkCount,
  archivedAt: sessionColumns.shape.archivedAt,
  issue: z.null(),
  pullRequest: z.null(),
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const SessionListOutput = z.strictObject({
  sessions: z.array(SessionInfo),
  nextCursor: z.string().nullable(),
});
export type SessionListOutput = z.infer<typeof SessionListOutput>;
