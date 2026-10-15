import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { fn } from 'storybook/test';
import { type AgentRowEntry } from '#features/agents';
import {
  customAgentDefinition,
  customAgentId,
} from '../../../features/agents/components/custom-agent.mocks';
import type { AgentListViewProps } from './agent-list-view';

const [example, python, binary, windows] = publishedRegistry.agents;

if (!example || !python || !binary || !windows)
  throw new Error('Registry mock needs four distribution examples');

export const catalog: AgentsCatalogOutput = {
  status: 'fresh',
  syncStatus: 'idle',
  serverPlatform: 'darwin-aarch64',
  fetchedAt: 1791504000000,
  error: null,
  rejectedValues: 0,
  agents: [
    {
      id: example.id,
      entry: example,
      support: {
        kind: 'npx',
        recipe: { package: 'example-agent@1.2.3', args: ['--acp'] },
      },
    },
    {
      id: python.id,
      entry: python,
      support: { kind: 'uvx', recipe: { package: 'python-agent==1.2.3' } },
    },
    {
      id: binary.id,
      entry: binary,
      support: {
        kind: 'binary',
        recipe: {
          archive: 'https://example.org/agent.tar.gz',
          cmd: './agent',
          args: ['--acp'],
        },
      },
    },
    {
      id: windows.id,
      entry: windows,
      support: {
        kind: 'unsupported',
        reason: 'No distribution for darwin-aarch64',
      },
    },
  ],
};

export const unavailableCatalog: AgentsCatalogOutput = {
  ...catalog,
  agents: [],
  fetchedAt: null,
  status: 'unavailable',
  syncStatus: 'failed',
  error: 'Registry is offline',
};

export const failedSyncCatalog: AgentsCatalogOutput = {
  ...catalog,
  status: 'stale',
  syncStatus: 'failed',
  error: 'Registry is offline',
};

// Installed Agents in every state the list draws; Update available has no Server source yet.
export const installedAgents: AgentRowEntry[] = [
  {
    id: 'first-agent',
    name: 'First Agent',
    description: 'Writes and reviews code',
    status: 'ready',
  },
  { id: 'second-agent', name: 'Second Agent', status: 'sign-in' },
  {
    id: 'third-agent',
    name: 'Third Agent',
    description: 'Runs in the terminal',
    status: 'update',
  },
  {
    id: customAgentId,
    name: customAgentDefinition.name,
    description: 'Custom ACP program',
    custom: true,
    status: 'ready',
  },
];

// A loaded catalog with installed Agents, and a spy for every callback.
export const agentListArgs = (): AgentListViewProps => ({
  catalog: { status: 'loaded', catalog },
  installed: installedAgents,
  onAddCustomAgent: fn(),
  onOpenAgent: fn(),
});

export const emptyCatalog: AgentsCatalogOutput = { ...catalog, agents: [] };

export const longCatalogSize = 200;

type CatalogAgent = AgentsCatalogOutput['agents'][number];

// A numbered copy without the mock's grey square logo, so its row shows the Agent glyph a missing logo gets.
const numbered = (agent: CatalogAgent, number: number): CatalogAgent => ({
  ...agent,
  id: `${agent.id}-${number}`,
  entry: {
    ...agent.entry,
    id: `${agent.id}-${number}`,
    name: `${agent.entry.name} ${number}`,
    icon: undefined,
  },
});

// The catalog's Agents copied and numbered until it offers 200, for a list that must scroll.
export const longCatalog: AgentsCatalogOutput = {
  ...catalog,
  agents: Array.from(
    { length: longCatalogSize / catalog.agents.length },
    (_, round) =>
      catalog.agents.map((agent, index) =>
        numbered(agent, round * catalog.agents.length + index + 1),
      ),
  ).flat(),
};

// A row's link is named "<name>, <description>, <status>"; this matches it by name alone.
export const agentLink = (name: string): RegExp => new RegExp(`^${name}, `);
