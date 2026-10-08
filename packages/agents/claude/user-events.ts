import type { AgentMapping } from '../src/agent-adapter';
import { dropped, upsert } from './feed-rows';
import type { MappingState } from './mapping-state';
import type { VendorMessage } from './messages';
import { toolCallEnded, type ToolResultBlock } from './tool-calls';
type User = Extract<VendorMessage, { type: 'user' }>;
export function mapUser(
  message: User,
  state: MappingState,
): AgentMapping<MappingState> {
  const content = message.message.content;
  if ('isReplay' in message || typeof content === 'string')
    return dropped(state);
  return content.reduce(
    (mapped, block): AgentMapping<MappingState> =>
      mapResultBlock(message, block, mapped),
    dropped(state),
  );
}
function mapResultBlock(
  message: User,
  block: Exclude<User['message']['content'], string>[number],
  mapped: AgentMapping<MappingState>,
): AgentMapping<MappingState> {
  if (block.type !== 'tool_result') return mapped;
  const next = mapToolResult(message, block, mapped.mappingState);
  return {
    events: [...mapped.events, ...next.events],
    mappingState: next.mappingState,
  };
}
function mapToolResult(
  message: User,
  block: ToolResultBlock,
  state: MappingState,
): AgentMapping<MappingState> {
  const row = state.openToolCalls[block.tool_use_id];
  if (!row) return dropped(state);
  const openToolCalls = { ...state.openToolCalls };
  delete openToolCalls[block.tool_use_id];
  return {
    events: [upsert(toolCallEnded(row, block, message))],
    mappingState: { ...state, openToolCalls },
  };
}
