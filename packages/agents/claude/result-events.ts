import type { StopReason, TurnUsage } from '@repo/contracts';
import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent } from '../src/agent-events';
import { feed, upsert } from './feed-rows';
import type { MappingState } from './mapping-state';
import { initialMappingState } from './mapping-state';
import type { SDKResultMessage } from './messages';
import { compaction } from './notice-events';
import type { ToolCallRow } from './tool-calls';
type Result = SDKResultMessage & { receivedAt?: number };
const TURN_ERROR_CODE = -32603;
export function mapResult(
  result: Result,
  state: MappingState,
): AgentMapping<MappingState> {
  const reason = stopReason(result);
  return {
    events: [...settleRows(result, state, reason), turnEnded(result, reason)],
    mappingState: initialMappingState(),
  };
}
function stopReason(result: SDKResultMessage): StopReason {
  if (
    result.terminal_reason === 'aborted_streaming' ||
    result.terminal_reason === 'aborted_tools'
  )
    return 'cancelled';
  return completedReason(result);
}
function completedReason(result: SDKResultMessage): StopReason {
  if (result.subtype === 'error_max_turns') return 'max_turn_requests';
  return hasTurnError(result) ? 'error' : successfulReason(result.stop_reason);
}
function hasTurnError(result: SDKResultMessage): boolean {
  return result.is_error || result.subtype !== 'success';
}
function successfulReason(reason: SDKResultMessage['stop_reason']): StopReason {
  return reason === 'max_tokens' || reason === 'refusal' ? reason : 'end_turn';
}
function turnUsage({ usage }: SDKResultMessage): TurnUsage {
  const cachedReadTokens = usage.cache_read_input_tokens ?? 0;
  const cachedWriteTokens = usage.cache_creation_input_tokens ?? 0;
  return {
    totalTokens: totalTokens(usage, cachedReadTokens, cachedWriteTokens),
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    ...thoughtUsage(usage),
    cachedReadTokens,
    cachedWriteTokens,
  };
}
function thoughtUsage(
  usage: SDKResultMessage['usage'],
): Pick<TurnUsage, 'thoughtTokens'> {
  const thoughtTokens = usage.output_tokens_details?.thinking_tokens;
  return thoughtTokens === undefined ? {} : { thoughtTokens };
}
function turnEnded(result: Result, reason: StopReason): AgentEvent {
  return {
    type: 'agent.turnEnded',
    stopReason: reason,
    usage: turnUsage(result),
    ...turnError(result, reason),
  };
}
function turnError(
  result: Result,
  reason: StopReason,
): Pick<Extract<AgentEvent, { type: 'agent.turnEnded' }>, 'error'> {
  if (reason !== 'error') return {};
  return {
    error: { code: TURN_ERROR_CODE, message: resultErrorMessage(result) },
  };
}
function resultErrorMessage(result: Result): string {
  return (
    (result.subtype === 'success' ? result.result : result.errors.join('\n')) ||
    'The Turn failed.'
  );
}
function settleRows(
  result: Result,
  state: MappingState,
  reason: StopReason,
): AgentEvent[] {
  const status = reason === 'cancelled' ? 'cancelled' : 'failed';
  return [
    ...settleCompaction(state, status),
    ...settleTexts(state),
    ...settleTools({ result, state, status }),
  ];
}
function settleTexts(state: MappingState): AgentEvent[] {
  return Object.keys(state.openTextRows).map((id): AgentEvent =>
    feed({ type: 'patch', id, set: { state: 'settled' } }),
  );
}
type SettleTools = {
  result: Result;
  state: MappingState;
  status: 'cancelled' | 'failed';
};
function settleTools({ result, state, status }: SettleTools): AgentEvent[] {
  return Object.values(state.openToolCalls).map((row): AgentEvent =>
    upsert({
      ...row,
      state: 'settled',
      status,
      ...endMetadata(row, result.receivedAt),
    }),
  );
}
function settleCompaction(
  state: MappingState,
  status: 'cancelled' | 'failed',
): AgentEvent[] {
  return state.compactionId === null
    ? []
    : [compaction(state.compactionId, 'settled', status)];
}
function endMetadata(
  row: ToolCallRow,
  endedAt: number | undefined,
): Pick<ToolCallRow, '_meta'> {
  return endedAt === undefined
    ? {}
    : { _meta: { argo: { ...row._meta?.argo, endedAt } } };
}

function totalTokens(
  usage: SDKResultMessage['usage'],
  cachedReadTokens: number,
  cachedWriteTokens: number,
): number {
  return (
    usage.input_tokens +
    usage.output_tokens +
    cachedReadTokens +
    cachedWriteTokens
  );
}
