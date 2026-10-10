import { z } from 'zod';
import { ContentBlock, UnsupportedContent } from './content-block';
import { createFeedMetadataSchema } from './metadata';
import type { ToolCallUpdate } from './session-update';

export const ToolKind = z.enum([
  'read',
  'edit',
  'delete',
  'move',
  'search',
  'execute',
  'think',
  'fetch',
  'switch_mode',
  'other',
]);
export type ToolKind = z.infer<typeof ToolKind>;

export const ToolCallStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);
export type ToolCallStatus = z.infer<typeof ToolCallStatus>;

export const runningToolCallStatuses: readonly [
  ToolCallStatus,
  ToolCallStatus,
] = ['pending', 'in_progress'];

export function isToolCallRunning(toolCall: ToolCallUpdate): boolean {
  return runningToolCallStatuses.includes(toolCall.status);
}

// Only actions supplied by an Agent; shell text is never classified by the App.
export const CommandAction = z.strictObject({
  type: z.enum(['read', 'search', 'list', 'unknown']),
  command: z.string(),
  path: z.string().optional(),
  query: z.string().optional(),
});
export type CommandAction = z.infer<typeof CommandAction>;

export function knownCommandActions(toolCall: ToolCallUpdate): CommandAction[] {
  const actions = toolCall._meta?.argo?.commandActions;
  return actions?.length &&
    actions.every((action): boolean => action.type !== 'unknown')
    ? actions
    : [];
}

export const ToolCallLocation = z.strictObject({
  path: z.string(),
  line: z.int().optional(),
});
export type ToolCallLocation = z.infer<typeof ToolCallLocation>;

export const DiffChange = z.strictObject({
  operation: z.enum(['add', 'delete', 'modify', 'move']),
  path: z.string(),
  oldPath: z.string().optional(),
  oldText: z.string().optional(),
  newText: z.string().optional(),
});
export type DiffChange = z.infer<typeof DiffChange>;

export const DiffPatch = z.strictObject({
  format: z.literal('git_patch'),
  text: z.string(),
});
export type DiffPatch = z.infer<typeof DiffPatch>;

// ACP `TerminalExitStatus`.
export const TerminalExitStatus = z.strictObject({
  exitCode: z.int().optional(),
  signal: z.string().optional(),
});
export type TerminalExitStatus = z.infer<typeof TerminalExitStatus>;

export const ToolCallContentBlock = z.strictObject({
  type: z.literal('content'),
  content: ContentBlock,
  _meta: createFeedMetadataSchema(z.strictObject({})),
});
export type ToolCallContentBlock = z.infer<typeof ToolCallContentBlock>;

export const ToolCallDiff = z.strictObject({
  type: z.literal('diff'),
  changes: z.array(DiffChange),
  patch: DiffPatch.optional(),
  _meta: createFeedMetadataSchema(z.strictObject({})),
});
export type ToolCallDiff = z.infer<typeof ToolCallDiff>;

export const ToolCallTerminal = z.strictObject({
  type: z.literal('terminal'),
  command: z.string(),
  cwd: z.string().optional(),
  output: z.string(),
  exitStatus: TerminalExitStatus.optional(),
  _meta: createFeedMetadataSchema(z.strictObject({})),
});
export type ToolCallTerminal = z.infer<typeof ToolCallTerminal>;

export const ToolCallContent = z.discriminatedUnion('type', [
  ToolCallContentBlock,
  ToolCallDiff,
  ToolCallTerminal,
  UnsupportedContent,
]);
export type ToolCallContent = z.infer<typeof ToolCallContent>;

// ACP `PermissionOptionKind`.
export const PermissionOptionKind = z.enum([
  'allow_once',
  'allow_always',
  'reject_once',
  'reject_always',
]);
export type PermissionOptionKind = z.infer<typeof PermissionOptionKind>;

// ACP `RequestPermissionOutcome`: how the user answered a Permission request, with the chosen option's name and kind so the Feed can show it. Rows written before the name and kind were kept lack them.
export const PermissionOutcome = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('cancelled') }),
  z.strictObject({
    outcome: z.literal('selected'),
    optionId: z.string(),
    name: z.string().optional(),
    kind: PermissionOptionKind.optional(),
  }),
]);
export type PermissionOutcome = z.infer<typeof PermissionOutcome>;
