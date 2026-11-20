import type { SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import { operationFeedRowId } from '@repo/contracts/operations';
import { agentOperationCall } from './operation-call';

/*
 * An Operation call is stored twice: the Agent's own Tool call and the Engine's row for the
 * Operation it ran. The Feed draws the Engine's, which carries the Operation's name and result, so
 * an Agent call is left out once an Engine row of the same Turn names the same Operation and params.
 * Each Engine row stands for one Agent call; an Agent call the Engine never recorded stays.
 */
const isToolCall = (row: SessionUpdate): row is ToolCallUpdate =>
  row.sessionUpdate === 'tool_call_update';

const isEngineRow = (row: ToolCallUpdate): boolean =>
  row.id === operationFeedRowId(row.toolCallId);

const callKey = (row: ToolCallUpdate, id: string, params: unknown): string =>
  JSON.stringify([row.sessionId, row.turnId, id, params]);

function unfoldedEngineRows(
  rows: readonly SessionUpdate[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!isToolCall(row) || !isEngineRow(row) || !row.name) continue;
    const key = callKey(row, row.name, row.rawInput ?? {});

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function withoutRecordedAgentCalls(
  rows: readonly SessionUpdate[],
): readonly SessionUpdate[] {
  const engine = unfoldedEngineRows(rows);

  if (!engine.size) return rows;

  return rows.filter((row) => {
    if (!isToolCall(row)) return true;
    const call = agentOperationCall(row);
    const key = call && callKey(row, call.id, call.params);
    const waiting = key ? (engine.get(key) ?? 0) : 0;

    if (!key || !waiting) return true;
    engine.set(key, waiting - 1);

    return false;
  });
}
