import type { ACPAgent, AgentsRegistryOutput } from '@repo/contracts';

const featuredIds = new Set([
  'claude-acp',
  'codex-acp',
  'github-copilot-cli',
  'cursor',
]);

export const featuredAgents = (registry: AgentsRegistryOutput): ACPAgent[] =>
  registry.agents
    .filter(
      ({ entry, support }) =>
        featuredIds.has(entry.id) && support !== 'unavailable',
    )
    .map(({ entry }) => entry);
