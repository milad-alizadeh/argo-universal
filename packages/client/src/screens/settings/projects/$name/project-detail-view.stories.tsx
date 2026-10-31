import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { fn } from 'storybook/test';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from '../../../../features/settings/components/settings-pages.mocks';
import { chosenAccounts } from './project-detail-accounts-fixtures';
import { pluginContributions } from './project-detail-plugins-fixtures';
import { ProjectDetailView } from './project-detail-view';

const meta = {
  title: 'Screens/Settings/Project',
  component: ProjectDetailView,
  argTypes: {
    name: { control: 'text' },
    otherDevice: { control: 'text' },
    project: { control: false },
    pluginContributions: { control: false },
    accounts: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    name: worktreeProject.name,
    project: { status: 'loaded', project: worktreeProject },
    onBack: action('back'),
  },
} satisfies Meta<typeof ProjectDetailView>;

export default meta;

const withSpies = pluginContributions.map((contribution) => ({
  ...contribution,
  onEvent: fn(),
}));

type Story = StoryObj<typeof meta>;

export const NewWorktree: Story = {};

export const Local: Story = {
  args: {
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
};

// Two Plugins in the Project details Slot, each in a section and card of its own.
export const PluginSections: Story = {
  args: { pluginContributions: withSpies },
};

// Each host's chosen Account, below Folder.
export const Accounts: Story = {
  args: { accounts: { hosts: chosenAccounts, onChooseAccount: fn() } },
};

export const OnAnotherDevice: Story = {
  args: { otherDevice: otherDeviceName },
};

export const Loading: Story = { args: { project: { status: 'loading' } } };

export const Missing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
};
