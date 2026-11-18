import type {
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { operationRecords, presentOperation } from './operation-records';

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

  return source?.type === 'tool_call'
    ? presentLiveCall(rows, source.toolCallId)
    : undefined;
}

function presentLiveCall(
  rows: readonly SessionUpdate[],
  toolCallId: string,
): ToolCallUpdate | undefined {
  const call = rows.findLast((row): row is ToolCallUpdate =>
    matchesToolCall(row, toolCallId),
  );

  return call && presentOperation(call, operationRecords(rows));
}

function liveSource(
  snapshot: SessionSnapshot | null,
): NonNullable<SessionSnapshot['liveHeader']>['source'] | undefined {
  return snapshot?.liveHeader?.source;
}

// A request can outlive the live activity label; only its own Turn and Session may supply its Tool input.
export function findPermissionToolCall(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
  sessionId: string | undefined,
): ToolCallUpdate | undefined {
  if (!snapshot?.pendingPermission) return undefined;
  const { toolCallId } = snapshot.pendingPermission;

  return rows
    .filter(
      (row) =>
        row.sessionId === sessionId && row.turnId === snapshot.activeTurnId,
    )
    .findLast((row): row is ToolCallUpdate => matchesToolCall(row, toolCallId));
}
