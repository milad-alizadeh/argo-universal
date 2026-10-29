import { sessionUpdateKinds, sessionUpdateStates } from '@repo/db/schema';
import { z } from 'zod';
import { shellColumns } from '../columns';
import { OperationWorkTarget } from '../operations/work';
import { TurnEnd } from '../sessions/turn';
import { CompactionUpdate } from './compaction';
import { BlobRef, ContentBlock } from './content-block';
import {
  AgentMessage,
  AgentThought,
  PromptMessage,
  SessionMessage,
  UserMessage,
} from './messages';
import { createFeedMetadataSchema } from './metadata';
import { Plan } from './plan';
import {
  CommandAction,
  PermissionOutcome,
  ToolCallContent,
  ToolCallLocation,
  ToolCallStatus,
  ToolKind,
} from './tool-call';
import { envelope, kind, noExtensionMeta } from './update-fields';

export * from './compaction';

export * from './messages';

export const SessionUpdateKind = z.enum(sessionUpdateKinds);

export type SessionUpdateKind = z.infer<typeof SessionUpdateKind>;

export const SessionUpdateState = z.enum(sessionUpdateStates);

export type SessionUpdateState = z.infer<typeof SessionUpdateState>;

export const ToolCallUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('tool_call_update'),
  toolCallId: z.string(),
  title: z.string(),
  name: z.string().optional(),
  kind: ToolKind,
  status: ToolCallStatus,
  content: z.array(ToolCallContent),
  locations: z.array(ToolCallLocation).optional(),
  rawInput: z.unknown().optional(),
  rawOutput: z.unknown().optional(),
  _meta: createFeedMetadataSchema(
    z.strictObject({
      truncated: z.boolean().optional(),
      // The whole value of each output field cut to its head and tail (ADR-0005).
      fullOutput: z
        .strictObject({
          content: BlobRef.optional(),
          rawOutput: BlobRef.optional(),
        })
        .optional(),
      permissionOutcome: PermissionOutcome.optional(),
      operationWork: OperationWorkTarget.optional(),
      commandActions: z.array(CommandAction).optional(),
      startedAt: z.int().optional(),
      endedAt: z.int().optional(),
      shellId: shellColumns.shape.id.optional(),
      description: z.string().optional(),
    }),
  ),
});

export type ToolCallUpdate = z.infer<typeof ToolCallUpdate>;

export const PlanUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('plan_update'),
  plan: Plan,
  _meta: createFeedMetadataSchema(
    z.strictObject({
      removed: z.boolean().optional(),
      contentRevision: z.int().optional(),
      unaddressedPlanAcpSessionId: z.string().optional(),
    }),
  ),
});

export type PlanUpdate = z.infer<typeof PlanUpdate>;

export const SubagentState = z.enum(['running', 'idle', 'requires_action']);

export type SubagentState = z.infer<typeof SubagentState>;

// ACP has no `wait` or `close`, so neither is an action (#930).
export const SubagentAction = z.enum(['spawn', 'message']);

export type SubagentAction = z.infer<typeof SubagentAction>;

// ACP's `sessionId` and `state` clash with the envelope's, so both carry a `subagent` prefix.
export const SubagentUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('subagent_update'),
  subagentSessionId: z.string(),
  title: z.string().optional(),
  subagentState: SubagentState.optional(),
  // `prompt` is the parent's outgoing message; `result` only an explicit reply from the child.
  _meta: createFeedMetadataSchema(
    z.strictObject({
      action: SubagentAction.optional(),
      prompt: z.array(ContentBlock).optional(),
      result: z.array(ContentBlock).optional(),
    }),
  ),
});

export type SubagentUpdate = z.infer<typeof SubagentUpdate>;

export const knownNoticeSeverities = ['info', 'warning', 'error'] as const;

const NoticeSeverity = z.string();

export const Notice = z.strictObject({
  ...envelope,
  sessionUpdate: kind('notice'),
  severity: NoticeSeverity,
  title: z.string(),
  description: z.string().optional(),
  _meta: createFeedMetadataSchema(
    z.strictObject({
      turnEnd: TurnEnd.optional(),
      retry: z
        .strictObject({
          attempt: z.int(),
          maxAttempts: z.int(),
          delayMs: z.int(),
        })
        .optional(),
    }),
  ),
});

export type Notice = z.infer<typeof Notice>;

const TaskStatus = z.enum(['running', 'completed', 'failed', 'cancelled']);

// Argo extension: a background task (ADR-0006).
export const TaskUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('task_update'),
  taskId: z.string(),
  status: TaskStatus,
  title: z.string(),
  _meta: noExtensionMeta,
});

export type TaskUpdate = z.infer<typeof TaskUpdate>;

// One Feed row. An unknown `sessionUpdate` kind or an unknown key fails to parse.
export const SessionUpdate = z.discriminatedUnion('sessionUpdate', [
  UserMessage,
  PromptMessage,
  SessionMessage,
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
