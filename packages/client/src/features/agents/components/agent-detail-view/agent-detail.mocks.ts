import { fn } from 'storybook/test';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import type { AgentInstallPresentation } from '../../state/agent-install-types';
import type { ToolInstallPresentation } from '../../state/missing-tool';
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

// A ready Agent with a spy for every callback.
export const agentDetailArgs = (): AgentDetailViewProps => ({
  agent: readyAgent,
  onBack: fn(),
  onInstall: fn(),
  onUpdate: fn(),
  onRemove: fn(),
  onRecheck: fn(),
  onSignIn: fn(),
  onRepair: fn(),
});

export const registryAgent: AgentDetail = {
  ...readyAgent,
  status: 'not-installed',
};

export const serverName = 'Milad’s Mac mini';

// An idle Install offer from the connected Server, with spies; override its state per story.
export const installationArgs = (
  overrides: Partial<AgentInstallPresentation> = {},
): AgentInstallPresentation => ({
  action: 'Install',
  version: readyAgent.version ?? '',
  server: serverName,
  confirming: false,
  installing: false,
  onConfirmingChange: fn(),
  onInstall: fn(),
  ...overrides,
});

// Homebrew on the connected Server, idle, with spies; override its state per story.
export const toolArgs = (
  overrides: Partial<ToolInstallPresentation> = {},
): ToolInstallPresentation => ({
  homebrew: true,
  server: serverName,
  confirming: false,
  installing: false,
  onConfirmingChange: fn(),
  onInstall: fn(),
  rechecking: false,
  onRecheck: fn(),
  ...overrides,
});
