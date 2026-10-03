import { z } from 'zod';
import { ContentBlock } from './content-block';

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

export const ToolCallLocation = z.strictObject({
  path: z.string().min(1),
  line: z.int().nonnegative().optional(),
});
export type ToolCallLocation = z.infer<typeof ToolCallLocation>;

export const DiffChange = z.strictObject({
  operation: z.enum(['add', 'delete', 'modify', 'move']),
  path: z.string().min(1),
  oldPath: z.string().min(1).optional(),
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
  exitCode: z.int().nonnegative().optional(),
  signal: z.string().min(1).optional(),
});
export type TerminalExitStatus = z.infer<typeof TerminalExitStatus>;

export const ToolCallContentBlock = z.strictObject({
  type: z.literal('content'),
  content: ContentBlock,
});
export type ToolCallContentBlock = z.infer<typeof ToolCallContentBlock>;

export const ToolCallDiff = z.strictObject({
  type: z.literal('diff'),
  changes: z.array(DiffChange),
  patch: DiffPatch.optional(),
});
export type ToolCallDiff = z.infer<typeof ToolCallDiff>;

export const ToolCallTerminal = z.strictObject({
  type: z.literal('terminal'),
  command: z.string(),
  cwd: z.string().min(1).optional(),
  output: z.string(),
  exitStatus: TerminalExitStatus.optional(),
});
export type ToolCallTerminal = z.infer<typeof ToolCallTerminal>;

export const ToolCallContent = z.discriminatedUnion('type', [
  ToolCallContentBlock,
  ToolCallDiff,
  ToolCallTerminal,
]);
export type ToolCallContent = z.infer<typeof ToolCallContent>;

// ACP `RequestPermissionOutcome`: how the user answered a Permission request.
export const PermissionOutcome = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('cancelled') }),
  z.strictObject({
    outcome: z.literal('selected'),
    optionId: z.string().min(1),
  }),
]);
export type PermissionOutcome = z.infer<typeof PermissionOutcome>;
