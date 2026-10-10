import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { fn } from 'storybook/test';
import type { AgentsSettingsViewProps } from './agents-settings-view';
import { customAgentDefinition, customAgentId } from './custom-agent.mocks';

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

// A loaded catalog with one custom Agent, and a spy for every callback.
export const agentsSettingsArgs = (): AgentsSettingsViewProps => ({
  search: '',
  onSearch: fn(),
  catalog: { status: 'loaded', catalog },
  refreshing: false,
  onRefresh: fn(),
  customAgents: [{ id: customAgentId, name: customAgentDefinition.name }],
  onAddCustomAgent: fn(),
  onOpenCustomAgent: fn(),
});
