import type { AgentAdapter, AgentMapping } from '@repo/agents';
import { playDiscovery, type DiscoveryScenario } from './discovery-scenario.ts';

const agentMetadata = (
  { discovery = [{}] }: { discovery?: readonly DiscoveryScenario[] },
  agent: string,
): AgentAdapter<never, null> => {
  return {
    agent,
    label: agent,
    logo: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    probe: discoverySequence(discovery),
    initialMappingState: (): null => null,
    toAgentEvents: rejectNativeStream,
    connect: rejectNativeConnection,
  };
};

const discoverySequence = (
  discovery: readonly DiscoveryScenario[],
): AgentAdapter<never, null>['probe'] => {
  let probes = 0;
  return (signal) =>
    playDiscovery(
      discovery[Math.min(probes++, discovery.length - 1)] ?? {},
      signal,
    );
};

const rejectNativeStream = (): AgentMapping<null> => {
  throw new Error('Metadata has no native Agent stream');
};
const rejectNativeConnection = (): never => {
  throw new Error('Agent metadata requires the scripted ACP process port');
};
export const createAgentMetadata = (
  options: { discovery?: readonly DiscoveryScenario[] } = {},
  agent = 'mock',
): AgentAdapter<never, null> => agentMetadata(options, agent);
