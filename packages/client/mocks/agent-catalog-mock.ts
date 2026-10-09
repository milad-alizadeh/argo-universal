import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import type { Fixtures } from './trpc-mock-link';

const [example, python, binary, windows] = publishedRegistry.agents;
if (!example || !python || !binary || !windows)
  throw new Error('Registry mock needs four distribution examples');

const catalog: AgentsCatalogOutput = {
  status: 'fresh',
  serverPlatform: 'darwin-aarch64',
  fetchedAt: '2026-10-09T00:00:00.000Z',
  error: null,
  rejectedValues: 0,
  agents: [
    {
      entry: example,
      support: {
        kind: 'npx',
        recipe: { package: 'example-agent@1.2.3', args: ['--acp'] },
      },
    },
    {
      entry: python,
      support: { kind: 'uvx', recipe: { package: 'python-agent==1.2.3' } },
    },
    {
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
      entry: windows,
      support: {
        kind: 'unsupported',
        reason: 'No distribution for darwin-aarch64',
      },
    },
  ],
};

export const agentCatalogMocks: Fixtures = {
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
