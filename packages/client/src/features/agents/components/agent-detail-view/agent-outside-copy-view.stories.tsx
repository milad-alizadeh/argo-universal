import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  homebrewCopy,
  installationArgs,
  managementArgs,
  outdated,
  unknownCopy,
} from './agent-detail.mocks';

// A copy Argo did not install: named for its owner, Disable instead of Remove, and Update the user runs.
const meta = {
  title: 'Screens/Settings/Agent outside copy',
  component: AgentDetailView,
  args: { ...agentDetailArgs(), management: managementArgs() },
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InstalledWithHomebrew: Story = {
  args: { agent: homebrewCopy },
};

export const InstalledWithNpm: Story = {
  args: {
    agent: { ...homebrewCopy, owner: 'npm', source: 'Installed with npm' },
  },
};

export const UpdateWithHomebrew: Story = {
  args: {
    agent: outdated(homebrewCopy, 'brew upgrade example-agent'),
    installation: installationArgs({ action: 'Update' }),
  },
};

export const UpdateFromAnUnknownOwner: Story = {
  args: {
    agent: outdated(unknownCopy),
    installation: installationArgs({ action: 'Update' }),
  },
};
