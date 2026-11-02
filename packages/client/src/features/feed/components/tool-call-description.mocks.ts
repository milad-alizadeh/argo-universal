import type { ToolCallUpdate } from '@repo/contracts';
import { recordedReports } from '@repo/mocks/app';

// The scripted Agent's Tool calls, persisted through the Engine's SQL Feed reader.
export function scriptedToolCall(toolCallId: string): ToolCallUpdate {
  const row = recordedReports.parent.find(
    (item): item is ToolCallUpdate =>
      item.sessionUpdate === 'tool_call_update' &&
      item.toolCallId === toolCallId,
  );

  if (!row) throw new Error(`Scripted recording needs ${toolCallId}`);

  return row;
}
