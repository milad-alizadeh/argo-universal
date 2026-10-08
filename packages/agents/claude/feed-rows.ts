import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedChange, FeedUpdate } from '../src/agent-events';
import type { MappingState, TextKind } from './mapping-state';
export const feed = (change: FeedChange): AgentEvent => ({
  type: 'agent.feed',
  change,
});
export const upsert = (update: FeedUpdate): ReturnType<typeof feed> =>
  feed({ type: 'upsert', update });

type TextRowInput = {
  id: string;
  messageId: string;
  kind: TextKind;
  text: string;
  state: 'open' | 'settled';
};
export const textRow = ({
  id,
  messageId,
  kind,
  text,
  state,
}: TextRowInput): FeedUpdate => ({
  id,
  sessionUpdate: kind,
  state,
  messageId,
  content: [{ type: 'text', text }],
});

// A text or thinking block as the row kind and text it becomes.
export const textOf = (
  block: Extract<
    import('./messages').SDKAssistantMessage['message']['content'][number],
    { type: 'text' | 'thinking' }
  >,
):
  | { kind: 'agent_message'; text: string }
  | { kind: 'agent_thought'; text: string } =>
  block.type === 'text'
    ? { kind: 'agent_message' as const, text: block.text }
    : { kind: 'agent_thought' as const, text: block.thinking };

export const dropped = (
  mappingState: MappingState,
): AgentMapping<MappingState> => ({
  events: [],
  mappingState,
});
