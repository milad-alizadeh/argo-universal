import type {
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

// The latest held row of the Tool call the live header names, if it names one.
export function findLiveToolCall(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
): ToolCallUpdate | undefined {
  const source = snapshot?.liveHeader?.source;
  if (source?.type !== 'tool_call') return undefined;
  return rows.findLast(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === source.toolCallId,
  );
}
