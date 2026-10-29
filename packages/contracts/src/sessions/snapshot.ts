import { z } from 'zod';
import { sessionColumns, turnColumns } from '../columns';
import { PermissionOptionKind } from '../feed/tool-call';
import { ChangesSummary } from './changes';
import { PendingElicitation } from './elicitation';
import { SessionInfo } from './list';
import { SessionConfigOption } from './set-config-option';
import { Shell } from './shells';
import { Subagent } from './subagent';

export * from './elicitation';

const SessionState = z.enum(['running', 'idle', 'requires_action']);

// ACP `usage_update`: reported context or a scoped upstream proxy.
export const ContextUsage = z.strictObject({
  used: z.int(),
  size: z.int(),
  scope: z.enum(['model-call', 'unverified']).optional(),
  cost: z
    .strictObject({
      amount: z.number(),
      currency: z.string(),
    })
    .optional(),
});

export type ContextUsage = z.infer<typeof ContextUsage>;

// ACP `PermissionOption`: the Agent names its own option ids.
export const PermissionOption = z.strictObject({
  optionId: z.string(),
  name: z.string(),
  kind: PermissionOptionKind,
});

export type PermissionOption = z.infer<typeof PermissionOption>;

export const permissionOptions: PermissionOption[] = [
  { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
  { optionId: 'reject_once', name: 'Deny', kind: 'reject_once' },
];

// A Permission request, after ACP `session/request_permission`; `requestId` is Argo's id for this one request.
export const PendingPermission = z.strictObject({
  requestId: z.string(),
  toolCallId: z.string(),
  title: z.string(),
  operation: z
    .strictObject({
      id: z.string(),
      description: z.string(),
      input: z.string(),
    })
    .optional(),
  // The plan text when the request asks to leave plan mode (ACP `switch_mode` Tool call content).
  plan: z.string().optional(),
  options: z
    .array(PermissionOption)
    .min(1)
    .refine(
      (options): boolean =>
        new Set(options.map((option): string => option.optionId)).size ===
        options.length,
      'Offer each option id once',
    ),
});

export type PendingPermission = z.infer<typeof PendingPermission>;

// Which step of the live header order produced its text.
export const LiveHeaderSource = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('request') }),
  z.strictObject({ type: z.literal('retry') }),
  z.strictObject({ type: z.literal('thought') }),
  z.strictObject({ type: z.literal('tool_call'), toolCallId: z.string() }),
  z.strictObject({ type: z.literal('working') }),
]);

export type LiveHeaderSource = z.infer<typeof LiveHeaderSource>;

// One line for what the Agent is doing; `startedAt` is the running Turn's start, null when no Turn runs.
export const LiveHeader = z.strictObject({
  text: z.string(),
  source: LiveHeaderSource,
  startedAt: turnColumns.shape.startedAt.nullable(),
});

export type LiveHeader = z.infer<typeof LiveHeader>;

// The live state of a Session that is not a Feed row. The Server holds it in memory, so only stored fields derive from columns (ADR 0013).
export const SessionSnapshot = z.strictObject({
  ...SessionInfo.pick({
    projectId: true,
    agent: true,
    title: true,
    titleSource: true,
    archivedAt: true,
    checkout: true,
  }).shape,
  startedBySessionId: sessionColumns.shape.startedBySessionId.default(null),
  state: SessionState,
  liveHeader: LiveHeader.nullable(),
  activeTurnId: turnColumns.shape.id.nullable(),
  usage: ContextUsage.nullable(),
  pendingPermission: PendingPermission.nullable(),
  pendingElicitation: PendingElicitation.nullable(),
  configOptions: z.array(SessionConfigOption),
  changes: ChangesSummary,
  shells: z.array(Shell).default([]),
  subagents: z.array(Subagent),
  maxRevision: sessionColumns.shape.maxRevision,
  epoch: sessionColumns.shape.epoch,
});

export type SessionSnapshot = z.infer<typeof SessionSnapshot>;
