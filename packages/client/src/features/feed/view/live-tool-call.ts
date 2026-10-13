import type {
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

function matchesToolCall(
  row: SessionUpdate,
  toolCallId: string,
): row is ToolCallUpdate {
  return (
    row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId
  );
}

export function findLiveToolCall(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
): ToolCallUpdate | undefined {
  const source = liveSource(snapshot);
  if (!source) return undefined;
  if (source.type !== 'tool_call') return undefined;
  return rows.findLast((row): row is ToolCallUpdate =>
    matchesToolCall(row, source.toolCallId),
  );
}

function liveSource(
  snapshot: SessionSnapshot | null,
): NonNullable<SessionSnapshot['liveHeader']>['source'] | undefined {
  return snapshot?.liveHeader?.source;
}
