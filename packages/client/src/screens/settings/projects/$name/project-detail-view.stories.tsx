import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { fn } from 'storybook/test';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from '../../../../features/settings/components/settings-pages.mocks';
import { chosenAccounts } from './project-detail-accounts-fixtures';
import { newSessionBranches } from './project-detail-new-sessions-fixtures';
import {
  longPathProject,
  pluginItems,
} from './project-detail-plugins-fixtures';
import { ProjectDetailView } from './project-detail-view';

const meta = {
  title: 'Screens/Settings/Project',
  component: ProjectDetailView,
  argTypes: {
    name: { control: 'text' },
    otherDevice: { control: 'text' },
    project: { control: false },
    pluginItems: { control: false },
    accounts: { control: false },
    newSessions: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    name: worktreeProject.name,
    project: { status: 'loaded', project: worktreeProject },
    onBack: action('back'),
    newSessions: {
      branches: newSessionBranches,
      onCheckoutChoiceChange: action('checkout choice'),
      onDeleteWorktreeOnArchiveChange: action('archive cleanup'),
    },
  },
} satisfies Meta<typeof ProjectDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewWorktree: Story = {};

// A path as long as a deep checkout's: it wraps beside the "Path" title, which keeps its own width.
export const LongPath: Story = {
  args: {
    project: { status: 'loaded', project: longPathProject },
  },
};

// Archiving keeps the folder, and the footer says so.
export const KeepsWorktreesOnArchive: Story = {
  args: {
    project: {
      status: 'loaded',
      project: { ...worktreeProject, deleteWorktreeOnArchive: false },
    },
  },
};

export const Local: Story = {
  args: {
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
};

// Two Plugins in the Project details Slot, each in a section and card of its own, their rows drawn by Argo.
export const PluginSections: Story = {
  args: { pluginItems, onOpenPluginPage: fn() },
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
