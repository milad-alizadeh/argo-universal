import type { FeedUpdate } from '../src/agent-events';
import type { SDKAssistantMessage, SDKUserMessage } from './messages';
export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

export type ToolUseBlock = Extract<
  SDKAssistantMessage['message']['content'][number],
  { type: 'tool_use' }
>;
export type ToolResultBlock = Extract<
  Exclude<SDKUserMessage['message']['content'], string>[number],
  { type: 'tool_result' }
>;

export type ToolShape = Pick<
  ToolCallRow,
  'title' | 'kind' | 'content' | 'locations'
>;
