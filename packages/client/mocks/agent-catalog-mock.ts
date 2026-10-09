import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import type { Fixtures } from './trpc-mock-link';
import { pending } from './trpc-mock-link';

const [example, python, binary, windows] = publishedRegistry.agents;
if (!example || !python || !binary || !windows)
  throw new Error('Registry mock needs four distribution examples');

const catalog: AgentsCatalogOutput = {
  status: 'fresh',
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

export const agentCatalogMocks: Fixtures = {
  'agents.syncCatalog': () => ({
    changedIds: [],
    error: null,
    rejectedValues: 0,
  }),
  'agents.catalogChanges': pending(),
  'agents.catalog': (input) => {
    const search = (input?.search ?? '').toLowerCase();
    return {
      ...catalog,
      agents: catalog.agents.filter(({ entry }) =>
        entry.name.toLowerCase().includes(search),
      ),
    };
  },
};
