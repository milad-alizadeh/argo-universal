import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  registryAgent,
  signInCommand,
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

export const NotSignedIn: Story = {
  args: {
    agent: { ...readyAgent, status: 'sign-in', signInCommand },
    onSignIn: fn(),
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
