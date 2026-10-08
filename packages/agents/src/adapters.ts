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
  probe: async (): Promise<{
    availability: 'unavailable';
    configOptions: never[];
  }> => ({ availability: 'unavailable', configOptions: [] }),
  connect: (): Promise<import('./agent-adapter').VendorSession> =>
    Promise.reject(new Error(`No Agent adapter for ${agent}.`)),
  initialMappingState: (): null => null,
  toAgentEvents: (
    _,
    mappingState,
  ): {
    events: never[];
    mappingState: Parameters<AgentAdapter['toAgentEvents']>[1];
  } => ({ events: [], mappingState }),
});

export const findAgentAdapter = (
  agent: string,
  adapters: readonly AgentAdapter[],
): AgentAdapter =>
  adapters.find((adapter): boolean => adapter.agent === agent) ??
  missingAdapter(agent);
