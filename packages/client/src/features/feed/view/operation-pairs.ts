import type {
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import {
  agentOperationCall,
  isEngineRow,
  OperationParams,
} from './operation-call';

const isToolCall = (row: SessionUpdate): row is ToolCallUpdate =>
  row.sessionUpdate === 'tool_call_update';

const sortedEntries = (params: OperationParams): [string, unknown][] =>
  Object.entries(params).sort(([first], [second]) =>
    first.localeCompare(second),
  );

// The same params in any key order name one call.
const callKey = (
  row: ToolCallUpdate,
  id: string,
  params: OperationParams,
): string =>
  JSON.stringify([row.sessionId, row.turnId, id, sortedEntries(params)]);

function engineRowsByCall(rows: readonly SessionUpdate[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!isToolCall(row) || !isEngineRow(row) || !row.name) continue;

    const key = callKey(
      row,
      row.name,
      OperationParams.safeParse(row.rawInput).data ?? {},
    );

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

// The key of an Agent call, unless it is the one a Permission request is waiting on: only that row carries the request.
function agentCallKey(
  row: ToolCallUpdate,
  snapshot: SessionSnapshot,
): string | undefined {
  if (row.toolCallId === snapshot.pendingPermission?.toolCallId)
    return undefined;
  const call = agentOperationCall(row);

  return call && callKey(row, call.id, call.params);
}

/*
 * An Operation call is stored twice: the Agent's own Tool call and the Engine's row for the
 * Operation it ran. The Feed draws the Engine's, which carries the Operation's name and result, so
 * an Agent call is left out once an Engine row of the same Turn names the same Operation and params.
 */
export function withoutRecordedAgentCalls(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): readonly SessionUpdate[] {
  const unmatched = engineRowsByCall(rows);

  if (!unmatched.size) return rows;

  const takesEngineRow = (row: SessionUpdate): boolean => {
    const key = isToolCall(row) ? agentCallKey(row, snapshot) : undefined;
    const open = key ? (unmatched.get(key) ?? 0) : 0;

    if (!key || !open) return false;
    unmatched.set(key, open - 1);

    return true;
  };

  return rows.filter((row) => !takesEngineRow(row));
}
