import { fn } from 'storybook/test';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import type { AgentInstallPresentation } from '../../state/agent-install-types';
import type { AgentManagement } from '../../state/agent-management-types';
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

const toolNeeds = {
  node: { status: 'needs-node', reason: 'npx isn’t on this Mac.' },
  uv: {
    status: 'needs-uv',
    reason: 'uvx isn’t on this Mac.',
    distribution: 'Python · needs uv',
  },
} as const;

// A registry Agent whose install needs a tool the Server lacks.
export const needingTool = (tool: keyof typeof toolNeeds): AgentDetail => ({
  ...registryAgent,
  ...toolNeeds[tool],
});

// A configured Agent's Enabled switch and Remove, idle, with spies.
export const managementArgs = (
  overrides: Partial<AgentManagement> = {},
): AgentManagement => ({
  enabled: true,
  busy: false,
  onEnabledChange: fn(),
  onRemove: fn(),
  onDismissFailure: fn(),
  ...overrides,
});

// A copy Homebrew installed, found on the Server's PATH.
export const homebrewCopy: AgentDetail = {
  ...readyAgent,
  distribution: undefined,
  owner: 'homebrew',
  source: 'Installed with Homebrew',
  path: '/opt/homebrew/bin/example-agent',
};

// A copy on PATH that nothing says how it was installed.
export const unknownCopy: AgentDetail = {
  ...homebrewCopy,
  owner: 'unknown',
  source: 'Found on this Mac',
  path: '/usr/local/bin/example-agent',
};

// The copy is behind the catalog's release; Homebrew and npm name their command.
export const outdated = (
  copy: AgentDetail,
  updateCommand?: string,
): AgentDetail => ({
  ...copy,
  status: 'update-available',
  version: '1.2.0',
  availableVersion: '1.3.0',
  updateCommand,
});
