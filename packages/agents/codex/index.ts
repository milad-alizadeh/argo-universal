import type { AgentAdapter } from '../src/agent-adapter';
import { connect } from './connect';
import { initialMappingState, toAgentEvents } from './to-agent-events';

export const codexAdapter = {
  agent: 'codex',
  connect,
  initialMappingState,
  toAgentEvents,
} satisfies AgentAdapter<
  Parameters<typeof toAgentEvents>[0],
  ReturnType<typeof initialMappingState>
>;
