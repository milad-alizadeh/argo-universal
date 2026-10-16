import type { AgentServer, AgentsRegistryOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { Platform } from 'react-native';
import { fn } from 'storybook/test';
import {
  type AgentRows,
  agentsPage,
  installedAgents as installedOf,
  type RegistryLoad,
} from '#features/agents';
import { mockHeader } from '../../../../mocks/screen-header-mock';
import type { AgentListViewProps } from './agent-list-view';
import { agentsHeader } from './agents-phone-header';

export const catalog: AgentsRegistryOutput = {
  error: null,
  agents: publishedRegistry.agents.map((entry, index) => ({
    entry,
    support: index === 1 ? 'unavailable' : 'npx',
  })),
};

const first = catalog.agents[0]?.entry;

if (!first) throw new Error('Registry fixture needs an Agent');

export const installedAgents: AgentServer[] = [
  {
    id: first.id,
    name: first.name,
    icon: first.icon,
    version: first.version,
    env: {},
  },
];

export const emptyCatalog: AgentsRegistryOutput = { agents: [], error: null };

export const longCatalog: AgentsRegistryOutput = {
  error: null,
  agents: Array.from({ length: 200 }, (_, index) => ({
    entry: {
      ...first,
      id: `agent-${index}`,
      name: `Agent ${String(index).padStart(3, '0')}`,
    },
    support: 'npx',
  })),
};

// The page's rows for the Server's Installed Agents and a Registry load, through the real rules.
export const pageRows = (
  installed: AgentServer[] = installedAgents,
  registry: RegistryLoad = { status: 'loaded', registry: catalog },
): AgentRows =>
  agentsPage(installedOf({ data: installed, isError: false }), registry);

export const agentListArgs = (): AgentListViewProps => ({
  agents: pageRows(),
  onInstall: fn(),
  onRemove: fn(),
  onRetry: fn(),
  renderHeader: Platform.OS === 'web' ? mockHeader(agentsHeader) : undefined,
});
