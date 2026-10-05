import type { TurnUsage } from '@repo/contracts';
import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import type { ThreadItem, TokenUsageBreakdown } from './protocol.gen';
import { toToolCall } from './tool-calls';

type TextKind = 'agent_message' | 'agent_thought';
export interface MappingState {
  vendorTurnId: string | null;
  openRows: Record<string, TextKind | 'tool_call_update'>;
  summaryIndexes: Record<string, number>;
  totalUsage: TokenUsageBreakdown | null;
  startingUsage: TokenUsageBreakdown | null;
}
export const initialMappingState = (): MappingState => ({
  vendorTurnId: null,
  openRows: {},
  summaryIndexes: {},
  totalUsage: null,
  startingUsage: null,
});
const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
const upsert = (update: FeedUpdate) => feed({ type: 'upsert', update });
const textRow = (
  id: string,
  kind: TextKind,
  text: string,
  state: 'open' | 'settled',
): FeedUpdate => ({
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
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> {
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
      },
    };
  }
  const vendorTurnId =
    message.method === 'turn/completed'
      ? message.params.turn.id
      : 'turnId' in message.params
        ? message.params.turnId
        : null;
  if (vendorTurnId !== mappingState.vendorTurnId || vendorTurnId === null)
    return dropped(mappingState);
  switch (message.method) {
    case 'turn/completed': {
      const { turn } = message.params;
      const stopReason =
        turn.status === 'interrupted'
          ? 'cancelled'
          : turn.status === 'failed'
            ? 'error'
            : 'end_turn';
      const unfinished = Object.entries(mappingState.openRows).map(
        ([id, kind]) =>
          feed({
            type: 'patch',
            id,
            set: {
              state: 'settled',
              ...(kind === 'tool_call_update'
                ? {
                    status: stopReason === 'cancelled' ? 'cancelled' : 'failed',
                  }
                : {}),
            },
          }),
      );
      const ended: AgentEvent = {
        type: 'agent.turnEnded',
        stopReason,
        ...(mappingState.totalUsage
          ? {
              usage: usageOf(
                mappingState.totalUsage,
                mappingState.startingUsage,
              ),
            }
          : {}),
        ...(turn.error
          ? {
              error: {
                code: -32603,
                message: turn.error.message,
                data: {
                  info: turn.error.codexErrorInfo,
                  details: turn.error.additionalDetails,
                },
              },
            }
          : {}),
      };
      return {
        events: [...unfinished, ended],
        mappingState: {
          ...initialMappingState(),
          totalUsage: mappingState.totalUsage,
        },
      };
    }
    case 'item/started':
    case 'item/completed':
      return mapItem(
        message.params.item,
        message.method === 'item/started' ? 'open' : 'settled',
        mappingState,
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
      const events: AgentEvent[] =
        previous === undefined
          ? [upsert(textRow(itemId, 'agent_thought', '', 'open'))]
          : [];
      const text =
        (previous !== undefined && summaryIndex > previous ? '\n\n' : '') +
        delta;
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
      return {
        events:
          tokenUsage.modelContextWindow === null
            ? []
            : [
                {
                  type: 'agent.usage',
                  usage: {
                    used: tokenUsage.last.totalTokens,
                    size: tokenUsage.modelContextWindow,
                  },
                },
              ],
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

function appendText(
  id: string,
  text: string,
  field: string,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  return id in mappingState.openRows
    ? { events: [feed({ type: 'append', id, field, text })], mappingState }
    : dropped(mappingState);
}
function mapItem(
  item: ThreadItem,
  state: 'open' | 'settled',
  mappingState: MappingState,
): AgentMapping<MappingState> {
  let row: FeedUpdate;
  switch (item.type) {
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
    case 'commandExecution':
      row = toToolCall(item, state);
      break;
    default:
      return dropped(mappingState);
  }
  const openRows = { ...mappingState.openRows };
  if (state === 'settled') delete openRows[item.id];
  else openRows[item.id] = row.sessionUpdate as TextKind | 'tool_call_update';
  return { events: [upsert(row)], mappingState: { ...mappingState, openRows } };
}
