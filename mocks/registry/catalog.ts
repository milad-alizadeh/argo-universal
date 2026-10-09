import type { ACPAgentRegistry } from '@repo/contracts';

const metadata = {
  version: '1.2.3',
  description: 'A compatible coding Agent',
  license_url: 'https://example.org/license',
  icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3Crect width="16" height="16" fill="%238e8e93"/%3E%3C/svg%3E',
};

export const publishedRegistry: ACPAgentRegistry = {
  version: '1.0.0',
  extensions: [],
  agents: [
    {
      ...metadata,
      id: 'example-agent',
      name: 'Example Agent',
      publisher_metadata: { channel: 'stable' },
      distribution: {
        npx: { package: 'example-agent@1.2.3', args: ['--acp'] },
      },
    },
    {
      ...metadata,
      id: 'python-agent',
      name: 'Python Agent',
      distribution: { uvx: { package: 'python-agent==1.2.3' } },
    },
    {
      ...metadata,
      id: 'binary-agent',
      name: 'Binary Agent',
      distribution: {
        binary: {
          'darwin-aarch64': {
            archive: 'https://example.org/agent.tar.gz',
            cmd: './agent',
            args: ['--acp'],
            sha256:
              '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          },
        },
      },
    },
    {
      ...metadata,
      id: 'windows-agent',
      name: 'Windows Agent',
      distribution: {
        binary: {
          'windows-x86_64': {
            archive: 'https://example.org/agent.zip',
            cmd: './agent.exe',
          },
        },
      },
    },
  ],
};

export const offlineRegistry = { offline: true };
export const malformedRegistry = {
  version: '1.0.0',
  agents: [{ id: 'broken' }],
};
