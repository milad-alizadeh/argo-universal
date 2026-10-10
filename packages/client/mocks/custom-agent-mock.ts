import type { ConfiguredAgent, CustomAgentDefinition } from '@repo/contracts';
import type { Fixtures } from './trpc-mock-link';

export const customAgentId = 'custom-agent-1';
export const customAgentDefinition: CustomAgentDefinition = {
  name: 'Example ACP',
  executable: '/opt/homebrew/bin/example-acp',
  args: ['--experimental-acp', '--model', 'example-pro'],
  env: [{ name: 'EXAMPLE_HOME', value: '/Users/example/.example' }],
};
export const customAgentFailure =
  '/opt/homebrew/bin/example-acp was not found.';

const configuredAgents: ConfiguredAgent[] = [
  {
    id: customAgentId,
    enabled: true,
    configuration: { source: 'custom', definition: customAgentDefinition },
  },
];

export const customAgentMocks: Fixtures = {
  'agents.configured': () => configuredAgents,
  'agents.check': () => ({ status: 'ready' }),
  'agents.registerCustom': () => ({ status: 'ready', agentId: customAgentId }),
  'agents.editCustom': () => ({ status: 'ready', agentId: customAgentId }),
};
