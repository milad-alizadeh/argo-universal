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
export function toAgentEvents(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (isSubagentMessage(message)) return dropped(state);
  return mapConversation(message, state);
}
function mapConversation(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (message.type === 'assistant') return mapAssistant(message, state);
  if (message.type === 'user') return mapUser(message, state);
  return mapSessionStatus(message, state);
}
function mapSessionStatus(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (message.type === 'result') return mapResult(message, state);
  if (message.type === 'system') return mapNotice(message, state);
  return mapInteraction(message, state);
}
function mapInteraction(
  message: VendorMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  if (message.type === 'stream_event') return mapStreamEvent(message, state);
  if (message.type === 'control_request')
    return { events: toRequestEvents(message), mappingState: state };
  return dropped(state);
}

function isSubagentMessage(message: VendorMessage): boolean {
  return 'parent_tool_use_id' in message && Boolean(message.parent_tool_use_id);
}
