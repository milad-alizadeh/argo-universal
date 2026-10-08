import type { ToolCallRow } from './tool-calls';
export type TextKind = 'agent_message' | 'agent_thought';
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
