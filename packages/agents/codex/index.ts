import { readFileSync } from 'node:fs';
import type { AgentAdapter } from '../src/agent-adapter';
import { connect } from './connect';
import { probe } from './probe';
import { initialMappingState, toAgentEvents } from './to-agent-events';

export const codexAdapter = {
  agent: 'codex',
  label: 'Codex',
  logo: readFileSync(
    new URL('./assets/openai-blossom-black.svg', import.meta.url),
    'utf8',
  ),
  probe,
  connect,
  initialMappingState,
  toAgentEvents,
} satisfies AgentAdapter<
  Parameters<typeof toAgentEvents>[0],
  ReturnType<typeof initialMappingState>
>;
