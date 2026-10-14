import type { AgentInfo, AgentsCatalogOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { iconAgent } from '../components/registry-icons.mocks';
import { agentDetail } from './agent-detail';

const notInstalled = 'not-installed';

const signInNeeded = 'sign-in-needed';

const probed: AgentInfo = {
  agent: iconAgent.id,
  label: iconAgent.entry.name,
  logo: '',
  enabled: true,
  status: signInNeeded,
};

const uvAgent = {
  ...iconAgent,
  support: { kind: 'uvx', recipe: { package: 'python-agent==1.2.3' } },
} as const;

const binaryAgent: AgentsCatalogOutput['agents'][number] = {
  ...iconAgent,
  support: {
    kind: 'binary',
    recipe: {
      archive: 'https://example.org/agent.tar.gz',
      cmd: './agent',
      args: ['--acp'],
    },
  },
};

const allTools = { node: true, uv: true };

it.each([
  {
    name: 'an npx Agent without Node.js',
    registry: iconAgent,
    missing: { node: false },
    status: 'needs-node',
  },
  {
    name: 'a uvx Agent without uv',
    registry: uvAgent,
    missing: { uv: false },
    status: 'needs-uv',
  },
  {
    name: 'an npx Agent without uv',
    registry: iconAgent,
    missing: { uv: false },
    status: notInstalled,
  },
  {
    name: 'a binary Agent with no tools at all',
    registry: binaryAgent,
    missing: { node: false, uv: false },
    status: notInstalled,
  },
  {
    name: 'an npx Agent with every tool',
    registry: iconAgent,
    missing: {},
    status: notInstalled,
  },
] as const)('reads $name as $status', ({ registry, missing, status }) => {
  expect(
    agentDetail(undefined, registry, { ...allTools, ...missing })?.status,
  ).toBe(status);
});

it('never says an installed Agent needs the tool its distribution installs with', () => {
  expect(
    agentDetail(probed, iconAgent, { ...allTools, node: false })?.status,
  ).toBe(signInNeeded);
});

it('reads a configured Agent with no installation as needing its missing tool', () => {
  expect(
    agentDetail({ ...probed, status: notInstalled }, iconAgent, {
      ...allTools,
      node: false,
    })?.status,
  ).toBe('needs-node');
});
