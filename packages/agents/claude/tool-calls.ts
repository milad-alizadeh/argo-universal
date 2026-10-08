import type { ToolKind } from '@repo/contracts';
import { ToolCallUpdate } from '@repo/contracts';
import { dictionary } from './dictionary';
import type { ToolCallRow, ToolUseBlock } from './tool-rows';
import { ownToolShape } from './tool-shapes';
export type { ToolCallRow, ToolResultBlock } from './tool-rows';
export { toolCallEnded } from './tool-results';
export function toolCallStarted(
  block: ToolUseBlock,
  timestamp?: number,
): ToolCallRow {
  const shape = ownToolShape(block) ?? {
    title: block.name,
    kind: 'other' satisfies ToolKind,
    content: [],
  };
  return {
    ...openToolRow(block),
    ...shape,
    ...startMetadata(block, timestamp),
  };
}
type OpenToolRow = Pick<
  ToolCallRow,
  | 'id'
  | 'sessionUpdate'
  | 'state'
  | 'toolCallId'
  | 'name'
  | 'status'
  | 'rawInput'
>;
function openToolRow(block: ToolUseBlock): OpenToolRow {
  return {
    id: block.id,
    sessionUpdate: 'tool_call_update',
    state: 'open',
    toolCallId: block.id,
    name: block.name,
    status: 'in_progress',
    rawInput: block.input,
  };
}
function startMetadata(
  block: ToolUseBlock,
  timestamp: number | undefined,
): Pick<ToolCallRow, '_meta'> {
  const description = toolDescription(block);
  const argo = { ...startedAt(timestamp), ...describedTool(description) };
  return Object.keys(argo).length === 0 ? {} : { _meta: { argo } };
}
function toolDescription(block: ToolUseBlock): string | undefined {
  if (block.name !== 'Bash') return undefined;
  return ToolCallUpdate.shape._meta
    .unwrap()
    .shape.argo.unwrap()
    .shape.description.parse(dictionary(block.input).description);
}
const startedAt = (
  timestamp: number | undefined,
): NonNullable<NonNullable<ToolCallRow['_meta']>['argo']> =>
  timestamp === undefined ? {} : { startedAt: timestamp };
function describedTool(
  description: string | undefined,
): NonNullable<NonNullable<ToolCallRow['_meta']>['argo']> {
  return description?.trim() ? { description } : {};
}
