import { fn } from 'storybook/test';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import { iconAgent } from '../registry-icons.mocks';

export const readyAgent: AgentDetail = {
  id: iconAgent.id,
  name: iconAgent.entry.name,
  description: iconAgent.entry.description,
  icon: iconAgent.entry.icon,
  status: 'ready',
  version: iconAgent.entry.version,
  distribution: 'npm · needs Node.js',
  links: [
    { label: 'GitHub', url: 'https://example.org/repository' },
    { label: 'Licence', url: 'https://example.org/licence' },
    { label: 'Website', url: 'https://example.org' },
  ],
};

export const signInCommand = 'example-agent login';

// A ready Agent with a spy for every callback.
export const agentDetailArgs = (): AgentDetailViewProps => ({
  agent: readyAgent,
  onBack: fn(),
  onInstall: fn(),
  onUpdate: fn(),
  onRemove: fn(),
  onCheckAgain: fn(),
});
