import type { AgentAdapter, AgentMapping } from '@repo/agents';
import { playDiscovery, type DiscoveryScenario } from './discovery-scenario.ts';

export const createAgentMetadata = (
  { discovery = [{}] }: { discovery?: readonly DiscoveryScenario[] } = {},
  agent = 'mock',
): AgentAdapter<never, null> => {
  let probes = 0;
  return {
    agent,
    label: agent,
    logo: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    probe: (signal) =>
      playDiscovery(
        discovery[Math.min(probes++, discovery.length - 1)] ?? {},
        signal,
      ),
    initialMappingState: (): null => null,
    toAgentEvents: (): AgentMapping<null> => {
      throw new Error('Metadata has no native Agent stream');
    },
    connect: (): never => {
      throw new Error('Agent metadata requires the scripted ACP process port');
    },
  };
};
