import type { AgentMapping } from '../src/agent-adapter';
import { mapAssistant } from './assistant-events';
import { dropped } from './feed-rows';
import type { MappingState } from './mapping-state';
import type { VendorMessage } from './messages';
import { mapNotice } from './notice-events';
import { toRequestEvents } from './request-events';
import { mapResult } from './result-events';
import { mapStreamEvent } from './stream-events';
import { mapUser } from './user-events';
export { initialMappingState, type MappingState } from './mapping-state';
type Handler = (
  message: VendorMessage,
  state: MappingState,
) => AgentMapping<MappingState>;
const handlers: Partial<Record<VendorMessage['type'], Handler>> = {
  control_request: mapRequest,
  stream_event: mapStream,
  assistant: mapAssistantMessage,
  user: mapUserMessage,
  result: mapResultMessage,
  system: mapSystemMessage,
};
export function toAgentEvents(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (isSubagentMessage(message)) return dropped(state);
  const handler = handlers[message.type];
  return handler ? handler(message, state) : dropped(state);
}
function mapRequest(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (message.type !== 'control_request') return dropped(state);
  return { events: toRequestEvents(message), mappingState: state };
}
function mapStream(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  return message.type === 'stream_event'
    ? mapStreamEvent(message, state)
    : dropped(state);
}
function mapAssistantMessage(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  return message.type === 'assistant'
    ? mapAssistant(message, state)
    : dropped(state);
}
function mapUserMessage(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  return message.type === 'user' ? mapUser(message, state) : dropped(state);
}
function mapResultMessage(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  return message.type === 'result' ? mapResult(message, state) : dropped(state);
}
function mapSystemMessage(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  return message.type === 'system' ? mapNotice(message, state) : dropped(state);
}

function isSubagentMessage(message: VendorMessage): boolean {
  return 'parent_tool_use_id' in message && Boolean(message.parent_tool_use_id);
}
