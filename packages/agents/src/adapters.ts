import { claudeAdapter } from '../claude';
import { codexAdapter } from '../codex';
import type { AgentAdapter } from './agent-adapter';

// Every Agent adapter the Server can start, the one place outside an adapter that names its vendor.
export const agentAdapters: readonly AgentAdapter[] = [
  claudeAdapter,
  codexAdapter,
];

// Stands in for an Agent with no adapter, so its Session fails with the reason.
const missingAdapter = (agent: string): AgentAdapter => ({
  agent,
  label: agent,
  logo: '',
  probe: async () => ({ availability: 'unavailable', configOptions: [] }),
  connect: () => Promise.reject(new Error(`No Agent adapter for ${agent}.`)),
  initialMappingState: () => null,
  toAgentEvents: (_, mappingState) => ({ events: [], mappingState }),
});

export const findAgentAdapter = (
  agent: string,
  adapters: readonly AgentAdapter[],
) =>
  adapters.find((adapter) => adapter.agent === agent) ?? missingAdapter(agent);
