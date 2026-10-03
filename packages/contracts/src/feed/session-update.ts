import {
  feedRow,
  sessionUpdateKinds,
  sessionUpdateStates,
} from '@argo/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { ContentBlock } from './content-block';
import { Plan } from './plan';
import {
  PermissionOutcome,
  ToolCallContent,
  ToolCallLocation,
  ToolCallStatus,
  ToolKind,
} from './tool-call';

export const SessionUpdateKind = z.enum(sessionUpdateKinds);
export type SessionUpdateKind = z.infer<typeof SessionUpdateKind>;

export const SessionUpdateState = z.enum(sessionUpdateStates);
export type SessionUpdateState = z.infer<typeof SessionUpdateState>;

const feedRowColumns = createSelectSchema(feedRow, {
  id: (schema) => schema.min(1),
  sessionId: (schema) => schema.min(1),
  position: (schema) => schema.nonnegative(),
  revision: (schema) => schema.nonnegative(),
  turnId: (schema) => schema.min(1),
});

// Fields every Feed row carries, from the `feed_row` table (spec section 6, ADR-0007).
const envelope = feedRowColumns.pick({
  id: true,
  sessionId: true,
  position: true,
  revision: true,
  turnId: true,
  state: true,
}).shape;

// One value of the `sessionUpdate` column, so a kind the table does not list fails `tsc`.
const kind = <Kind extends SessionUpdateKind>(value: Kind) =>
  feedRowColumns.shape.sessionUpdate.extract([value]);

// `_meta` is ACP's extension slot; Argo's own fields live under `_meta.argo` (ADR-0006).
const meta = <Argo extends z.ZodObject>(argo: Argo) =>
  z.strictObject({ argo: argo.optional() }).optional();
const noArgoMeta = meta(z.strictObject({}));

const message = {
  messageId: z.string().min(1),
  content: z.array(ContentBlock),
  _meta: noArgoMeta,
};

export const UserMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('user_message'),
  ...message,
});
export type UserMessage = z.infer<typeof UserMessage>;

export const AgentMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('agent_message'),
  ...message,
});
export type AgentMessage = z.infer<typeof AgentMessage>;

export const AgentThought = z.strictObject({
  ...envelope,
  sessionUpdate: kind('agent_thought'),
  ...message,
});
export type AgentThought = z.infer<typeof AgentThought>;

export const ToolCallUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('tool_call_update'),
  toolCallId: z.string().min(1),
  title: z.string(),
  name: z.string().min(1).optional(),
  kind: ToolKind,
  status: ToolCallStatus,
  content: z.array(ToolCallContent),
  locations: z.array(ToolCallLocation).optional(),
  rawInput: z.unknown().optional(),
  rawOutput: z.unknown().optional(),
  _meta: meta(
    z.strictObject({
      truncated: z.boolean().optional(),
      permissionOutcome: PermissionOutcome.optional(),
    }),
  ),
});
export type ToolCallUpdate = z.infer<typeof ToolCallUpdate>;

export const PlanUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('plan_update'),
  plan: Plan,
  _meta: noArgoMeta,
});
export type PlanUpdate = z.infer<typeof PlanUpdate>;

export const CompactionStatus = z.enum([
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);
export type CompactionStatus = z.infer<typeof CompactionStatus>;

export const CompactionUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('compaction_update'),
  compactionId: z.string().min(1),
  status: CompactionStatus,
  summary: z.array(ContentBlock).optional(),
  _meta: noArgoMeta,
});
export type CompactionUpdate = z.infer<typeof CompactionUpdate>;

export const SubagentState = z.enum(['running', 'idle', 'requires_action']);
export type SubagentState = z.infer<typeof SubagentState>;

// ACP's `sessionId` and `state` clash with the envelope's, so both carry a `subagent` prefix.
export const SubagentUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('subagent_update'),
  subagentSessionId: z.string().min(1),
  title: z.string().optional(),
  subagentState: SubagentState.optional(),
  _meta: noArgoMeta,
});
export type SubagentUpdate = z.infer<typeof SubagentUpdate>;

export const NoticeSeverity = z.enum(['info', 'warning', 'error']);
export type NoticeSeverity = z.infer<typeof NoticeSeverity>;

export const Notice = z.strictObject({
  ...envelope,
  sessionUpdate: kind('notice'),
  severity: NoticeSeverity,
  title: z.string().min(1),
  description: z.string().optional(),
  _meta: meta(
    z.strictObject({
      retry: z
        .strictObject({
          attempt: z.int().positive(),
          maxAttempts: z.int().positive(),
          delayMs: z.int().nonnegative(),
        })
        .optional(),
      // A vendor shape that the adapter did not recognise (ADR-0012).
      unrecognised: z.strictObject({ excerpt: z.string() }).optional(),
    }),
  ),
});
export type Notice = z.infer<typeof Notice>;

export const TaskStatus = z.enum([
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

// Argo extension: a background task (ADR-0006).
export const TaskUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('task_update'),
  taskId: z.string().min(1),
  status: TaskStatus,
  title: z.string(),
  _meta: noArgoMeta,
});
export type TaskUpdate = z.infer<typeof TaskUpdate>;

// One Feed row. An unknown `sessionUpdate` kind or an unknown key fails to parse.
export const SessionUpdate = z.discriminatedUnion('sessionUpdate', [
  UserMessage,
  AgentMessage,
  AgentThought,
  ToolCallUpdate,
  PlanUpdate,
  CompactionUpdate,
  SubagentUpdate,
  Notice,
  TaskUpdate,
]);
export type SessionUpdate = z.infer<typeof SessionUpdate>;
