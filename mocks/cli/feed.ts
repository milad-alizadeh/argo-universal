import type { AgentAdapter, AgentEvent } from '@repo/agents';

// Runs the real converter in order, carrying the same mapping state as the Agent machine.
export function recordedFeedEvents<Message, MappingState>(
  adapter: Pick<
    AgentAdapter<Message, MappingState>,
    'toAgentEvents' | 'initialMappingState'
  >,
  messages: Message[],
): AgentEvent[] {
  let state = adapter.initialMappingState();
  return messages.flatMap((message): AgentEvent[] => {
    const mapped = adapter.toAgentEvents(message, state);
    state = mapped.mappingState;
    return mapped.events;
  });
}
