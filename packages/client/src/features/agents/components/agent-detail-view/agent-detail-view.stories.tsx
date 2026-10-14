import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  registryAgent,
} from './agent-detail.mocks';

const meta = {
  title: 'Screens/Settings/Agent',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const FoundOnThisMac: Story = {
  args: {
    agent: {
      ...readyAgent,
      source: 'Found on this Mac',
      distribution: undefined,
    },
  },
};

export const InstalledByArgo: Story = {
  args: {
    agent: {
      ...readyAgent,
      source: 'Installed by Argo',
      distribution: undefined,
    },
  },
};

export const Checking: Story = {
  args: { agent: { ...readyAgent, status: 'checking' } },
};

export const SignInNeeded: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'sign-in-needed',
      reason: 'The Agent requires sign-in.',
    },
  },
};

export const AccountNotSupported: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'account-not-supported',
      reason: 'The Agent did not report a compatible subscription account.',
    },
  },
};

export const NotCompatible: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'not-compatible',
      reason: `${readyAgent.name} does not support the ACP session/close capability Argo needs.`,
    },
  },
};

export const CantStart: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'cant-start',
      reason: `${readyAgent.name} exited before answering ACP initialize.`,
    },
  },
};

export const CouldntCheck: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'couldnt-check',
      reason: 'Readiness could not be determined.',
    },
  },
};

export const NotFound: Story = {
  args: {
    agent: {
      ...readyAgent,
      status: 'not-found',
      reason: `The installed files of ${readyAgent.name} are missing. Repair installs them again.`,
    },
  },
};

export const UpdateAvailable: Story = {
  args: { agent: { ...readyAgent, status: 'update' } },
};

export const FromTheRegistry: Story = {
  args: { agent: registryAgent },
};
export const ConfirmingInstall: Story = {
  args: {
    agent: registryAgent,
    installation: installationArgs({ confirming: true }),
  },
};
export const Installing: Story = {
  args: {
    agent: registryAgent,
    installation: installationArgs({ installing: true }),
  },
};
export const Updating: Story = {
  args: {
    agent: { ...readyAgent, status: 'update' },
    installation: installationArgs({ action: 'Update', installing: true }),
  },
};
export const Enabled: Story = {
  args: {
    management: {
      enabled: true,
      busy: false,
      onEnabledChange: fn(),
      onRemove: fn(),
      onDismissFailure: fn(),
    },
  },
};
export const Disabled: Story = {
  args: {
    management: {
      enabled: false,
      busy: false,
      onEnabledChange: fn(),
      onRemove: fn(),
      onDismissFailure: fn(),
    },
  },
};
