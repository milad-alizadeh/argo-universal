import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { customAgentMocks } from './custom-agent-mock';
import type { Fixtures } from './trpc-mock-link';
import { pending } from './trpc-mock-link';

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

const [exampleCatalog, pythonCatalog, binaryCatalog, windowsCatalog] =
  catalog.agents;
if (!exampleCatalog || !pythonCatalog || !binaryCatalog || !windowsCatalog)
  throw new Error('Catalog fixture is incomplete');

export const agentCatalogMocks: Fixtures = {
  ...customAgentMocks,
  'agents.syncCatalog': () => ({ accepted: true }),
  'agents.catalogChanges': pending(),
  'agents.catalog': (input) => {
    if (!input?.search) return catalog;
    const searchResponses: Record<string, AgentsCatalogOutput['agents']> = {
      Example: [exampleCatalog],
      Python: [pythonCatalog],
      Binary: [binaryCatalog],
      Windows: [windowsCatalog],
    };
    return { ...catalog, agents: searchResponses[input.search] ?? [] };
  },
};
