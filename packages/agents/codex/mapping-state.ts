import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import type { TokenUsageBreakdown } from './protocol.gen';
import type { ToolCallRow } from './tool-calls';
export const messageTextField = 'content.0.text';

export type TextKind = 'agent_message' | 'agent_thought';
export type TextRow = Extract<FeedUpdate, { sessionUpdate: TextKind }>;
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
export const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
export const upsert = (update: FeedUpdate): AgentEvent =>
  feed({ type: 'upsert', update });
interface TextRowInput {
  id: string;
  kind: TextKind;
  text: string;
  state: 'open' | 'settled';
}
export const textRow = ({ id, kind, text, state }: TextRowInput): TextRow => ({
  id,
  sessionUpdate: kind,
  messageId: id,
  state,
  content: [{ type: 'text', text }],
});
export const dropped = (
  mappingState: MappingState,
): AgentMapping<MappingState> => ({
  events: [],
  mappingState,
});
