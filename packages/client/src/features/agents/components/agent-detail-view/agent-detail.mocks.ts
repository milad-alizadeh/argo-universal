import { fn } from 'storybook/test';
import type {
  AgentDetail,
  AgentDetailViewProps,
  SessionDefault,
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

const modelDefault: SessionDefault = {
  id: 'model',
  label: 'Model',
  value: 'large',
  options: [
    { value: 'large', label: 'Large' },
    { value: 'small', label: 'Small' },
  ],
};
const effortDefault: SessionDefault = {
  id: 'effort',
  label: 'Effort',
  value: 'medium',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
};

const modeDefault: SessionDefault = {
  id: 'mode',
  label: 'Mode',
  value: 'ask',
  options: [
    { value: 'ask', label: 'Ask before edits' },
    { value: 'auto', label: 'Edit automatically' },
  ],
};

// A ready Agent with model, effort and mode choices, and a spy for every callback.
export const agentDetailArgs = (): AgentDetailViewProps => ({
  agent: readyAgent,
  defaults: [modelDefault, effortDefault, modeDefault],
  onDefaultChange: fn(),
  onBack: fn(),
  onInstall: fn(),
  onUpdate: fn(),
  onRemove: fn(),
  onCheckAgain: fn(),
});
