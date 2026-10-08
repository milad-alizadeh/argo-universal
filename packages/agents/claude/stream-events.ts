import type { SDKPartialAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentMapping } from '../src/agent-adapter';
import { dropped, feed, upsert } from './feed-rows';
import { textOf, textRow } from './feed-rows';
import type { MappingState } from './mapping-state';
type StreamEvent = SDKPartialAssistantMessage['event'];
type Delta = Extract<StreamEvent, { type: 'content_block_delta' }>['delta'];
function deltaText(delta: Delta): string {
  if (delta.type === 'text_delta') return delta.text;
  if (delta.type === 'thinking_delta') return delta.thinking;
  return '';
}
export function mapStreamEvent(
  { event }: SDKPartialAssistantMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (event.type === 'message_start')
    return dropped({ ...state, streamMessageId: event.message.id });
  return mapContentEvent(event, state);
}
function mapContentEvent(
  event: StreamEvent,
  state: MappingState,
): AgentMapping<MappingState> {
  if (event.type === 'content_block_start') return startBlock(event, state);
  if (event.type === 'content_block_delta') return appendBlock(event, state);
  return dropped(state);
}
function startBlock(
  event: Extract<StreamEvent, { type: 'content_block_start' }>,
  state: MappingState,
): AgentMapping<MappingState> {
  const block = event.content_block;
  if (block.type !== 'text' && block.type !== 'thinking') return dropped(state);
  return startText(event.index, textOf(block), state);
}
function startText(
  index: number,
  text: ReturnType<typeof textOf>,
  state: MappingState,
): AgentMapping<MappingState> {
  const messageId = state.streamMessageId;
  if (messageId === null) return dropped(state);
  const id = `${messageId}#${index}`;
  const events = [upsert(textRow({ id, messageId, ...text, state: 'open' }))];
  return { events, mappingState: openTextState(state, id, text.kind) };
}
function openTextState(
  state: MappingState,
  id: string,
  kind: ReturnType<typeof textOf>['kind'],
): MappingState {
  return { ...state, openTextRows: { ...state.openTextRows, [id]: kind } };
}
function appendBlock(
  event: Extract<StreamEvent, { type: 'content_block_delta' }>,
  state: MappingState,
): AgentMapping<MappingState> {
  const id = `${state.streamMessageId}#${event.index}`;
  const text = deltaText(event.delta);
  if (!(id in state.openTextRows) || !text) return dropped(state);
  return {
    events: [feed({ type: 'append', id, field: 'content.0.text', text })],
    mappingState: state,
  };
}
