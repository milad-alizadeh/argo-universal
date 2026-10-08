import type { TurnUsage } from '@repo/contracts';
import { rejectAgentMessage, type AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import type { MappedThreadItem, MappedTurn } from './messages';
import { isVendorMessage } from './payloads.ts';
import type { TokenUsageBreakdown } from './protocol.gen';
import { toRequestEvents } from './request-events';
import { type ToolCallRow, toToolCall } from './tool-calls';

type TextKind = 'agent_message' | 'agent_thought';
type TextRow = Extract<FeedUpdate, { sessionUpdate: TextKind }>;
export interface MappingState {
  vendorTurnId: string | null;
  openRows: Record<string, TextKind | 'tool_call_update' | 'compaction_update'>;
  summaryIndexes: Record<string, number>;
  totalUsage: TokenUsageBreakdown | null;
  startingUsage: TokenUsageBreakdown | null;
  toolMetadata: Record<string, ToolCallRow['_meta']>;
}
export const initialMappingState = (): MappingState => ({
  vendorTurnId: null,
  openRows: {},
  summaryIndexes: {},
  totalUsage: null,
  startingUsage: null,
  toolMetadata: {},
});
// On the jscpd baseline: each adapter keeps its own row helpers, and a shared one would be shallow.
const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
const upsert = (update: FeedUpdate): AgentEvent =>
  feed({ type: 'upsert', update });
const textRow = (
  id: string,
  kind: TextKind,
  text: string,
  state: 'open' | 'settled',
): TextRow => ({
  id,
  sessionUpdate: kind,
  messageId: id,
  state,
  content: [{ type: 'text', text }],
});
const dropped = (mappingState: MappingState): AgentMapping<MappingState> => ({
  events: [],
  mappingState,
});
const subtractUsage = (
  total: TokenUsageBreakdown,
  start: TokenUsageBreakdown | null,
): TokenUsageBreakdown => ({
  totalTokens: total.totalTokens - (start?.totalTokens ?? 0),
  inputTokens: total.inputTokens - (start?.inputTokens ?? 0),
  outputTokens: total.outputTokens - (start?.outputTokens ?? 0),
  reasoningOutputTokens:
    total.reasoningOutputTokens - (start?.reasoningOutputTokens ?? 0),
  cachedInputTokens: total.cachedInputTokens - (start?.cachedInputTokens ?? 0),
  cacheWriteInputTokens:
    total.cacheWriteInputTokens - (start?.cacheWriteInputTokens ?? 0),
});
const usageOf = (
  total: TokenUsageBreakdown,
  start: TokenUsageBreakdown | null,
): TurnUsage => {
  const usage = subtractUsage(total, start);
  return {
    totalTokens: usage.totalTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    thoughtTokens: usage.reasoningOutputTokens,
    cachedReadTokens: usage.cachedInputTokens,
    cachedWriteTokens: usage.cacheWriteInputTokens,
  };
};

// The Session owns Argo Turn ids; this converter tracks vendor identity and emits unenveloped changes.
export function toAgentEvents(
  message: unknown,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  if (!isVendorMessage(message)) return rejectAgentMessage(mappingState);
  if (!message.params) return dropped(mappingState);
  if (
    message.method === 'thread/tokenUsage/updated' &&
    mappingState.vendorTurnId === null
  )
    return dropped({
      ...mappingState,
      totalUsage: message.params.tokenUsage.total,
    });
  if (message.method === 'turn/started') {
    if (mappingState.vendorTurnId === message.params.turn.id)
      return dropped(mappingState);
    return {
      events: [{ type: 'agent.turnStarted' }],
      mappingState: {
        ...mappingState,
        vendorTurnId: message.params.turn.id,
        startingUsage: mappingState.totalUsage,
        openRows: {},
        summaryIndexes: {},
        toolMetadata: {},
      },
    };
  }
  let vendorTurnId: string | undefined;
  if (message.method === 'turn/completed')
    vendorTurnId = message.params.turn.id;
  else if (
    'turnId' in message.params &&
    typeof message.params.turnId === 'string'
  )
    vendorTurnId = message.params.turnId;
  if (!vendorTurnId || vendorTurnId !== mappingState.vendorTurnId)
    return dropped(mappingState);
  const requests = toRequestEvents(message);
  if (requests.length) return { events: requests, mappingState };
  switch (message.method) {
    case 'turn/completed':
      return endTurn(message.params.turn, mappingState, message.receivedAt);
    case 'item/started':
    case 'item/completed':
      return mapItem(
        message.params.item,
        message.method === 'item/started' ? 'open' : 'settled',
        mappingState,
        message.method === 'item/started'
          ? (message.params.startedAtMs ?? message.receivedAt)
          : (message.params.completedAtMs ?? message.receivedAt),
      );
    case 'item/agentMessage/delta':
      return appendText(
        message.params.itemId,
        message.params.delta,
        'content.0.text',
        mappingState,
      );
    case 'item/commandExecution/outputDelta':
      return appendText(
        message.params.itemId,
        message.params.delta,
        'content.0.output',
        mappingState,
      );
    case 'item/reasoning/summaryTextDelta': {
      const { itemId, delta, summaryIndex } = message.params;
      if (mappingState.openRows[itemId] !== 'agent_thought')
        return dropped(mappingState);
      const previous = mappingState.summaryIndexes[itemId];
      const events: AgentEvent[] = [];
      if (previous === undefined)
        events.push(upsert(textRow(itemId, 'agent_thought', '', 'open')));
      let text = delta;
      if (previous !== undefined && summaryIndex > previous)
        text = `\n\n${delta}`;
      events.push(
        feed({ type: 'append', id: itemId, field: 'content.0.text', text }),
      );
      return {
        events,
        mappingState: {
          ...mappingState,
          summaryIndexes: {
            ...mappingState.summaryIndexes,
            [itemId]: summaryIndex,
          },
        },
      };
    }
    case 'item/reasoning/textDelta':
      if (message.params.itemId in mappingState.summaryIndexes)
        return dropped(mappingState);
      return appendText(
        message.params.itemId,
        message.params.delta,
        'content.0.text',
        mappingState,
      );
    case 'thread/tokenUsage/updated': {
      const { tokenUsage } = message.params;
      const events: AgentEvent[] = [];
      if (tokenUsage.modelContextWindow !== null)
        events.push({
          type: 'agent.usage',
          usage: {
            used: tokenUsage.last.totalTokens,
            size: tokenUsage.modelContextWindow,
          },
        });
      return {
        events,
        mappingState: {
          ...mappingState,
          totalUsage: tokenUsage.total,
          startingUsage:
            mappingState.startingUsage ??
            subtractUsage(tokenUsage.total, tokenUsage.last),
        },
      };
    }
    default:
      return dropped(mappingState);
  }
}

function endTurn(
  turn: MappedTurn,
  mappingState: MappingState,
  endedAt?: number,
): AgentMapping<MappingState> {
  const ended: Extract<AgentEvent, { type: 'agent.turnEnded' }> = {
    type: 'agent.turnEnded',
    stopReason: 'end_turn',
  };
  if (turn.status === 'interrupted') ended.stopReason = 'cancelled';
  else if (turn.status === 'failed') ended.stopReason = 'error';
  if (mappingState.totalUsage)
    ended.usage = usageOf(mappingState.totalUsage, mappingState.startingUsage);
  if (turn.error)
    ended.error = {
      code: -32603,
      message: turn.error.message,
      data: {
        info: turn.error.codexErrorInfo,
        details: turn.error.additionalDetails,
      },
    };
  const unfinished = Object.entries(mappingState.openRows).map(
    ([id, kind]): AgentEvent => {
      const set: Record<string, unknown> = { state: 'settled' };
      if (kind === 'tool_call_update' || kind === 'compaction_update')
        set.status = ended.stopReason === 'cancelled' ? 'cancelled' : 'failed';
      if (kind === 'tool_call_update' && endedAt !== undefined)
        set._meta = {
          argo: { ...mappingState.toolMetadata[id]?.argo, endedAt },
        };
      return feed({ type: 'patch', id, set });
    },
  );
  return {
    events: [...unfinished, ended],
    mappingState: {
      ...initialMappingState(),
      totalUsage: mappingState.totalUsage,
    },
  };
}

function appendText(
  id: string,
  text: string,
  field: string,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  if (!(id in mappingState.openRows)) return dropped(mappingState);
  return { events: [feed({ type: 'append', id, field, text })], mappingState };
}
function mapItem(
  item: MappedThreadItem,
  state: 'open' | 'settled',
  mappingState: MappingState,
  timestamp: number | undefined,
): AgentMapping<MappingState> {
  let row:
    | TextRow
    | ToolCallRow
    | Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>;
  switch (item.type) {
    case 'plan':
      if (state === 'open') return dropped(mappingState);
      return {
        mappingState,
        events: [
          upsert({
            id: item.id,
            sessionUpdate: 'plan_update',
            state,
            plan: { type: 'markdown', planId: item.id, content: item.text },
          }),
          { type: 'agent.planProposed', planId: item.id, content: item.text },
        ],
      };
    case 'contextCompaction':
      row = {
        id: item.id,
        compactionId: item.id,
        sessionUpdate: 'compaction_update',
        state,
        status: state === 'open' ? 'in_progress' : 'completed',
      };
      break;
    case 'agentMessage':
      row = textRow(item.id, 'agent_message', item.text, state);
      break;
    case 'reasoning':
      row = textRow(
        item.id,
        'agent_thought',
        (item.summary.length ? item.summary : item.content).join('\n\n'),
        state,
      );
      break;
    case 'fileChange':
    case 'commandExecution': {
      row = toToolCall(item, state);
      const metadata = {
        ...mappingState.toolMetadata[item.id]?.argo,
        ...row._meta?.argo,
      };
      if (timestamp !== undefined) {
        if (state === 'open') metadata.startedAt = timestamp;
        else metadata.endedAt = timestamp;
      }
      row._meta = { argo: metadata };
      break;
    }
    default:
      return dropped(mappingState);
  }
  const openRows = { ...mappingState.openRows };
  const toolMetadata = { ...mappingState.toolMetadata };
  if (row.sessionUpdate === 'tool_call_update' && state === 'open')
    toolMetadata[item.id] = row._meta;
  if (state === 'settled') delete openRows[item.id];
  else openRows[item.id] = row.sessionUpdate;
  if (state === 'settled') delete toolMetadata[item.id];
  return {
    events: [upsert(row)],
    mappingState: { ...mappingState, openRows, toolMetadata },
  };
}
