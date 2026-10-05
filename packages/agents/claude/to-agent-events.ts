import type { StopReason, TurnUsage } from '@repo/contracts';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import { type ToolCallRow, toolCallEnded, toolCallStarted } from './tool-calls';
import {
  type AssistantBlock,
  AssistantMessage,
  hiddenSystemSubtypes,
  hiddenTypes,
  MessageHeader,
  NoticeMessage,
  type ResultMessage,
  ResultMessage as ResultMessageSchema,
  StreamEvent,
  ToolResultBlock,
  UserMessage,
} from './vendor-messages';

type TextKind = 'agent_message' | 'agent_thought';

// What `toAgentEvents` remembers between messages; plain data, so it can live in machine context.
export interface MappingState {
  // Prefixes ids of rows that the vendor gives no id, so they stay unique across runs of one Session.
  idPrefix: string;
  unrecognised: number;
  // Blocks seen per `message.id`, which gives a block's index without the stream.
  blockCounts: Record<string, number>;
  streamMessageId: string | null;
  // Text rows that streamed in and wait for their record, by row id.
  openTextRows: Record<string, TextKind>;
  // Tool calls that wait for their result, by Tool call id.
  openToolCalls: Record<string, ToolCallRow>;
}

export const initialMappingState = (idPrefix: string): MappingState => ({
  idPrefix,
  unrecognised: 0,
  blockCounts: {},
  streamMessageId: null,
  openTextRows: {},
  openToolCalls: {},
});

interface Mapped {
  events: AgentEvent[];
  mappingState: MappingState;
}

const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
const upsert = (update: FeedUpdate) => feed({ type: 'upsert', update });

const textRow = (
  id: string,
  messageId: string,
  kind: TextKind,
  text: string,
  state: 'open' | 'settled',
): FeedUpdate => ({
  id,
  sessionUpdate: kind,
  state,
  messageId,
  content: [{ type: 'text', text }],
});

const EXCERPT_LENGTH = 500;

// Reports a message the adapter cannot read, as ADR-0012 asks: reject, report, count.
function unrecognised(message: unknown, mappingState: MappingState): Mapped {
  const count = mappingState.unrecognised + 1;
  return {
    events: [
      upsert({
        id: `${mappingState.idPrefix}:unrecognised:${count}`,
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'warning',
        title: 'Argo did not recognise a message from the Agent',
        _meta: {
          argo: {
            unrecognised: {
              excerpt: (JSON.stringify(message) ?? String(message)).slice(
                0,
                EXCERPT_LENGTH,
              ),
            },
          },
        },
      }),
    ],
    mappingState: { ...mappingState, unrecognised: count },
  };
}

const dropped = (mappingState: MappingState): Mapped => ({
  events: [],
  mappingState,
});

// Maps one SDK message to Agent events (ADR-0006); pure, so recordings can drive it.
export function toAgentEvents(
  message: unknown,
  mappingState: MappingState,
): Mapped {
  const header = MessageHeader.safeParse(message);
  if (!header.success) return unrecognised(message, mappingState);
  // Subagent messages belong to issue 11e.
  if (header.data.parent_tool_use_id) return dropped(mappingState);
  const { type, subtype } = header.data;
  if (hiddenTypes.has(type)) return dropped(mappingState);

  const mapped = (() => {
    switch (type) {
      case 'stream_event':
        return mapStreamEvent(message, mappingState);
      case 'assistant':
        return mapAssistant(message, mappingState);
      case 'user':
        return mapUser(message, mappingState);
      case 'result':
        return mapResult(message, mappingState);
      case 'system':
        if (subtype !== undefined && hiddenSystemSubtypes.has(subtype))
          return dropped(mappingState);
        return mapNotice(message, mappingState);
      default:
        return undefined;
    }
  })();
  return mapped ?? unrecognised(message, mappingState);
}

function mapStreamEvent(
  message: unknown,
  mappingState: MappingState,
): Mapped | undefined {
  const parsed = StreamEvent.safeParse(message);
  if (!parsed.success) return undefined;
  const { event } = parsed.data;
  const { streamMessageId } = mappingState;
  switch (event.type) {
    case 'message_start':
      return dropped({ ...mappingState, streamMessageId: event.message.id });
    case 'content_block_start': {
      const block = event.content_block;
      const kind: TextKind | undefined =
        block.type === 'text'
          ? 'agent_message'
          : block.type === 'thinking'
            ? 'agent_thought'
            : undefined;
      if (!kind || streamMessageId === null) return dropped(mappingState);
      const id = `${streamMessageId}#${event.index}`;
      const text = String(block.text ?? block.thinking ?? '');
      return {
        events: [upsert(textRow(id, streamMessageId, kind, text, 'open'))],
        mappingState: {
          ...mappingState,
          openTextRows: { ...mappingState.openTextRows, [id]: kind },
        },
      };
    }
    case 'content_block_delta': {
      const id = `${streamMessageId}#${event.index}`;
      const text = event.delta.text ?? event.delta.thinking;
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
  message: unknown,
  mappingState: MappingState,
): Mapped | undefined {
  const parsed = AssistantMessage.safeParse(message);
  if (!parsed.success) return undefined;
  const { id: messageId, content } = parsed.data.message;
  let state = mappingState;
  const events: AgentEvent[] = [];
  for (const block of content) {
    const index = state.blockCounts[messageId] ?? 0;
    state = {
      ...state,
      blockCounts: { ...state.blockCounts, [messageId]: index + 1 },
    };
    const mapped = mapBlock(block, `${messageId}#${index}`, messageId, state);
    events.push(...mapped.events);
    state = mapped.mappingState;
  }
  return { events, mappingState: state };
}

function mapBlock(
  block: AssistantBlock,
  rowId: string,
  messageId: string,
  mappingState: MappingState,
): Mapped {
  switch (block.type) {
    case 'text':
    case 'thinking': {
      const kind = block.type === 'text' ? 'agent_message' : 'agent_thought';
      const text = block.type === 'text' ? block.text : block.thinking;
      const { [rowId]: _settled, ...openTextRows } = mappingState.openTextRows;
      return {
        events: [upsert(textRow(rowId, messageId, kind, text, 'settled'))],
        mappingState: { ...mappingState, openTextRows },
      };
    }
    case 'tool_use': {
      const row = toolCallStarted(block);
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
  message: unknown,
  mappingState: MappingState,
): Mapped | undefined {
  const parsed = UserMessage.safeParse(message);
  if (!parsed.success) return undefined;
  const { content } = parsed.data.message;
  if (parsed.data.isReplay || typeof content === 'string')
    return dropped(mappingState);
  let state = mappingState;
  const events: AgentEvent[] = [];
  for (const block of content) {
    if (block.type !== 'tool_result') continue;
    const result = ToolResultBlock.safeParse(block);
    if (!result.success) {
      const reported = unrecognised(block, state);
      events.push(...reported.events);
      state = reported.mappingState;
      continue;
    }
    const row = state.openToolCalls[result.data.tool_use_id];
    if (!row) continue;
    events.push(upsert(toolCallEnded(row, result.data, parsed.data)));
    const { [result.data.tool_use_id]: _ended, ...openToolCalls } =
      state.openToolCalls;
    state = { ...state, openToolCalls };
  }
  return { events, mappingState: state };
}

const TURN_ERROR_CODE = -32603;

function stopReason(result: ResultMessage): StopReason {
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

function turnUsage({ usage }: ResultMessage): TurnUsage {
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
  message: unknown,
  mappingState: MappingState,
): Mapped | undefined {
  const parsed = ResultMessageSchema.safeParse(message);
  if (!parsed.success) return undefined;
  const result = parsed.data;
  const reason = stopReason(result);
  const settles = [
    ...Object.keys(mappingState.openTextRows).map((id) =>
      feed({ type: 'patch', id, set: { state: 'settled' } }),
    ),
    ...Object.values(mappingState.openToolCalls).map((row) =>
      upsert({
        ...row,
        state: 'settled',
        status: reason === 'cancelled' ? 'cancelled' : 'failed',
      }),
    ),
  ];
  const errorMessage =
    result.result ?? result.errors?.join('\n') ?? 'The Turn failed.';
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
    mappingState: {
      ...mappingState,
      streamMessageId: null,
      openTextRows: {},
      openToolCalls: {},
    },
  };
}

function mapNotice(
  message: unknown,
  mappingState: MappingState,
): Mapped | undefined {
  const parsed = NoticeMessage.safeParse(message);
  if (!parsed.success) return undefined;
  const notice = parsed.data;
  const base = {
    id: notice.uuid,
    sessionUpdate: 'notice',
    state: 'settled',
  } as const;
  const update = ((): FeedUpdate | undefined => {
    switch (notice.subtype) {
      case 'api_retry':
        return {
          ...base,
          severity: 'warning',
          title: `Retrying (${notice.attempt} of ${notice.max_retries})`,
          _meta: {
            argo: {
              retry: {
                attempt: notice.attempt,
                maxAttempts: notice.max_retries,
                delayMs: notice.retry_delay_ms,
              },
            },
          },
        };
      case 'local_command_output':
        return { ...base, severity: 'info', title: notice.content };
      case 'informational':
        return {
          ...base,
          severity: notice.level === 'warning' ? 'warning' : 'info',
          title: notice.content,
        };
      case 'notification':
        return { ...base, severity: 'info', title: notice.text };
      case 'hook_response':
        return notice.outcome === 'error'
          ? {
              ...base,
              severity: 'warning',
              title: `Hook ${notice.hook_name} failed`,
              ...(notice.stderr ? { description: notice.stderr } : {}),
            }
          : undefined;
    }
  })();
  return update
    ? { events: [upsert(update)], mappingState }
    : dropped(mappingState);
}
