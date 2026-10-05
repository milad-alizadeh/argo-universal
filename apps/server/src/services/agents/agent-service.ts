import type { AgentAdapter, AgentProbe } from '@repo/agents';
import type { AgentsService } from '@repo/api';

const PROBE_TIMEOUT = 20_000;

// Probes every Agent on each call, so installing or signing in shows without a restart.
export function createAgentService(
  adapters: readonly AgentAdapter[],
): AgentsService {
  const probe = (adapter: AgentAdapter): Promise<AgentProbe> =>
    adapter.probe(AbortSignal.timeout(PROBE_TIMEOUT)).catch((error) => ({
      availability: 'unavailable',
      installStep: `${adapter.label} did not start: ${error instanceof Error ? error.message : String(error)}`,
      configOptions: [],
    }));
  return {
    list: () =>
      Promise.all(
        adapters.map(async (adapter) => ({
          agent: adapter.agent,
          label: adapter.label,
          logo: adapter.logo,
          ...(await probe(adapter)),
        })),
      ),
  };
}
