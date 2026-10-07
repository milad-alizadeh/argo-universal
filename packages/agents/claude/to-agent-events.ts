import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
  SDKUserMessageReplay,
} from '@anthropic-ai/claude-agent-sdk';
import type { StopReason, TurnUsage } from '@repo/contracts';
import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import { toRequestEvents } from './request-events';
import { type ToolCallRow, toolCallEnded, toolCallStarted } from './tool-calls';

type TextKind = 'agent_message' | 'agent_thought';
type AssistantBlock = SDKAssistantMessage['message']['content'][number];
// What `toAgentEvents` remembers between messages, until the Turn's result clears it.
export interface MappingState {
  // Blocks seen per `message.id`, which gives a block's index without the stream.
  blockCounts: Record<string, number>;
  streamMessageId: string | null;
  // Text rows that streamed in and wait for their record, by row id.
  openTextRows: Record<string, TextKind>;
  // Tool calls that wait for their result, by Tool call id.
  openToolCalls: Record<string, ToolCallRow>;
  compactionId: string | null;
}

export const initialMappingState = (): MappingState => ({
  blockCounts: {},
  streamMessageId: null,
  openTextRows: {},
  openToolCalls: {},
  compactionId: null,
});

const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
const upsert = (update: FeedUpdate) => feed({ type: 'upsert', update });

const textRow = ({
  id,
  messageId,
  kind,
  text,
  state,
}: {
  id: string;
  messageId: string;
  kind: TextKind;
  text: string;
  state: 'open' | 'settled';
}): FeedUpdate => ({
  id,
  sessionUpdate: kind,
  state,
  messageId,
  content: [{ type: 'text', text }],
});

// A text or thinking block as the row kind and text it becomes.
const textOf = (
  block:
    | { type: 'text'; text: string }
    | { type: 'thinking'; thinking: string },
) =>
  block.type === 'text'
    ? { kind: 'agent_message' as const, text: block.text }
    : { kind: 'agent_thought' as const, text: block.thinking };

const dropped = (mappingState: MappingState): AgentMapping<MappingState> => ({
  events: [],
  mappingState,
});

// Maps one SDK message to Agent events (ADR-0006); pure, so recordings can drive it.
export function toAgentEvents(
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  // Subagent messages belong to issue 11e.
  if ('parent_tool_use_id' in message && message.parent_tool_use_id)
    return dropped(mappingState);
  switch (message.type) {
    case 'control_request':
      return { events: toRequestEvents(message), mappingState };
    case 'stream_event':
      return mapStreamEvent(message, mappingState);
    case 'assistant':
      return mapAssistant(message, mappingState);
    case 'user':
      return mapUser(message, mappingState);
    case 'result':
      return mapResult(message, mappingState);
    case 'system':
      return mapNotice(message, mappingState);
    default:
      return dropped(mappingState);
  }
}

type Delta = Extract<
  SDKPartialAssistantMessage['event'],
  { type: 'content_block_delta' }
>['delta'];

function deltaText(delta: Delta) {
  if (delta.type === 'text_delta') return delta.text;
  if (delta.type === 'thinking_delta') return delta.thinking;
  return '';
}

function mapStreamEvent(
  { event }: SDKPartialAssistantMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  const { streamMessageId } = mappingState;
  switch (event.type) {
    case 'message_start':
      return dropped({ ...mappingState, streamMessageId: event.message.id });
    case 'content_block_start': {
      const block = event.content_block;
      if (
        (block.type !== 'text' && block.type !== 'thinking') ||
        streamMessageId === null
      )
        return dropped(mappingState);
      const { kind, text } = textOf(block);
      const id = `${streamMessageId}#${event.index}`;
      return {
        events: [
          upsert(
            textRow({
              id,
              messageId: streamMessageId,
              kind,
              text,
              state: 'open',
            }),
          ),
        ],
        mappingState: {
          ...mappingState,
          openTextRows: { ...mappingState.openTextRows, [id]: kind },
        },
      };
    }
    case 'content_block_delta': {
      const id = `${streamMessageId}#${event.index}`;
      const text = deltaText(event.delta);
      if (!(id in mappingState.openTextRows) || !text)
        return dropped(mappingState);
      return {
        events: [feed({ type: 'append', id, field: 'content.0.text', text })],
        mappingState,
      };
    }
    default:
      return dropped(mappingState);
  }
}

function mapAssistant(
  message: SDKAssistantMessage & { receivedAt?: number },
  mappingState: MappingState,
): AgentMapping<MappingState> {
  const { id: messageId, content } = message.message;
  let state = mappingState;
  const events: AgentEvent[] = [];
  for (const block of content) {
    const index = state.blockCounts[messageId] ?? 0;
    state = {
      ...state,
      blockCounts: { ...state.blockCounts, [messageId]: index + 1 },
    };
    const mapped = mapBlock({
      block,
      rowId: `${messageId}#${index}`,
      messageId,
      mappingState: state,
      timestamp:
        message.timestamp === undefined
          ? message.receivedAt
          : Date.parse(message.timestamp),
    });
    events.push(...mapped.events);
    state = mapped.mappingState;
  }
  return { events, mappingState: state };
}

function mapBlock({
  block,
  rowId,
  messageId,
  mappingState,
  timestamp,
}: {
  block: AssistantBlock;
  rowId: string;
  messageId: string;
  mappingState: MappingState;
  timestamp?: number;
}): AgentMapping<MappingState> {
  switch (block.type) {
    case 'text':
    case 'thinking': {
      const { kind, text } = textOf(block);
      const { [rowId]: _settled, ...openTextRows } = mappingState.openTextRows;
      return {
        events: [
          upsert(
            textRow({
              id: rowId,
              messageId,
              kind,
              text,
              state: 'settled',
            }),
          ),
        ],
        mappingState: { ...mappingState, openTextRows },
      };
    }
    case 'tool_use': {
      const row = toolCallStarted(block, timestamp);
      return {
        events: [upsert(row)],
        mappingState: {
          ...mappingState,
          openToolCalls: { ...mappingState.openToolCalls, [block.id]: row },
        },
      };
    }
    default:
      return dropped(mappingState);
  }
}

// A user message carries Tool results; the Session writes the user's own prompt.
function mapUser(
  message: (SDKUserMessage | SDKUserMessageReplay) & { receivedAt?: number },
  mappingState: MappingState,
): AgentMapping<MappingState> {
  const { content } = message.message;
  if ('isReplay' in message || typeof content === 'string')
    return dropped(mappingState);
  let state = mappingState;
  const events: AgentEvent[] = [];
  for (const block of content) {
    if (block.type !== 'tool_result') continue;
    const row = state.openToolCalls[block.tool_use_id];
    if (!row) continue;
    events.push(upsert(toolCallEnded(row, block, message)));
    const { [block.tool_use_id]: _ended, ...openToolCalls } =
      state.openToolCalls;
    state = { ...state, openToolCalls };
  }
  return { events, mappingState: state };
}

const TURN_ERROR_CODE = -32603;

function stopReason(result: SDKResultMessage): StopReason {
  if (
    result.terminal_reason === 'aborted_streaming' ||
    result.terminal_reason === 'aborted_tools'
  )
    return 'cancelled';
  if (result.subtype === 'error_max_turns') return 'max_turn_requests';
  if (result.is_error || result.subtype !== 'success') return 'error';
  return result.stop_reason === 'max_tokens' || result.stop_reason === 'refusal'
    ? result.stop_reason
    : 'end_turn';
}

function turnUsage({ usage }: SDKResultMessage): TurnUsage {
  const cachedReadTokens = usage.cache_read_input_tokens ?? 0;
  const cachedWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const thoughtTokens = usage.output_tokens_details?.thinking_tokens;
  return {
    totalTokens:
      usage.input_tokens +
      usage.output_tokens +
      cachedReadTokens +
      cachedWriteTokens,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    ...(thoughtTokens === undefined ? {} : { thoughtTokens }),
    cachedReadTokens,
    cachedWriteTokens,
  };
}

// The result ends the Turn, and settles rows that never got their record or result.
function mapResult(
  result: SDKResultMessage & { receivedAt?: number },
  mappingState: MappingState,
): AgentMapping<MappingState> {
  const reason = stopReason(result);
  const settles = [
    ...(mappingState.compactionId === null
      ? []
      : [
          compaction(
            mappingState.compactionId,
            'settled',
            reason === 'cancelled' ? 'cancelled' : 'failed',
          ),
        ]),
    ...Object.keys(mappingState.openTextRows).map((id) =>
      feed({ type: 'patch', id, set: { state: 'settled' } }),
    ),
    ...Object.values(mappingState.openToolCalls).map((row) =>
      upsert({
        ...row,
        state: 'settled',
        status: reason === 'cancelled' ? 'cancelled' : 'failed',
        ...(result.receivedAt === undefined
          ? {}
          : {
              _meta: {
                argo: { ...row._meta?.argo, endedAt: result.receivedAt },
              },
            }),
      }),
    ),
  ];
  const errorMessage =
    (result.subtype === 'success' ? result.result : result.errors.join('\n')) ||
    'The Turn failed.';
  return {
    events: [
      ...settles,
      {
        type: 'agent.turnEnded',
        stopReason: reason,
        usage: turnUsage(result),
        ...(reason === 'error'
          ? { error: { code: TURN_ERROR_CODE, message: errorMessage } }
          : {}),
      },
    ],
    mappingState: initialMappingState(),
  };
}

function mapNotice(
  message: Extract<SDKMessage, { type: 'system' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  if (message.subtype === 'status' && message.status === 'compacting') {
    const id = mappingState.compactionId ?? message.uuid;
    return {
      events: [compaction(id, 'open', 'in_progress')],
      mappingState: { ...mappingState, compactionId: id },
    };
  }
  if (message.subtype === 'compact_boundary') {
    const id = mappingState.compactionId ?? message.uuid;
    return {
      events: [compaction(id, 'settled', 'completed')],
      mappingState: { ...mappingState, compactionId: null },
    };
  }
  if (
    message.subtype === 'status' &&
    message.compact_result === 'failed' &&
    mappingState.compactionId !== null
  )
    return {
      events: [compaction(mappingState.compactionId, 'settled', 'failed')],
      mappingState: { ...mappingState, compactionId: null },
    };
  const base = {
    id: message.uuid,
    sessionUpdate: 'notice',
    state: 'settled',
  } as const;
  const update = ((): FeedUpdate | undefined => {
    switch (message.subtype) {
      case 'api_retry':
        return {
          ...base,
          severity: 'warning',
          title: `Retrying (${message.attempt} of ${message.max_retries})`,
          _meta: {
            argo: {
              retry: {
                attempt: message.attempt,
                maxAttempts: message.max_retries,
                delayMs: message.retry_delay_ms,
              },
            },
          },
        };
      case 'local_command_output':
        return { ...base, severity: 'info', title: message.content };
      case 'informational':
        return {
          ...base,
          severity: message.level === 'warning' ? 'warning' : 'info',
          title: message.content,
        };
      case 'notification':
        return { ...base, severity: 'info', title: message.text };
      case 'hook_response':
        return message.outcome === 'error'
          ? {
              ...base,
              severity: 'warning',
              title: `Hook ${message.hook_name} failed`,
              ...(message.stderr ? { description: message.stderr } : {}),
            }
          : undefined;
      default:
        return undefined;
    }
  })();
  return update
    ? { events: [upsert(update)], mappingState }
    : dropped(mappingState);
}

function compaction(
  id: string,
  state: 'open' | 'settled',
  status: Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>['status'],
): AgentEvent {
  return upsert({
    id,
    compactionId: id,
    sessionUpdate: 'compaction_update',
    state,
    status,
  });
}
