import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from '../../../../features/settings/components/settings-pages.mocks';
import { ProjectDetailView } from './project-detail-view';

const meta = {
  title: 'Screens/Settings/Project',
  component: ProjectDetailView,
  parameters: { screenPreview: true },
  args: {
    name: worktreeProject.name,
    project: { status: 'loaded', project: worktreeProject },
    onBack: action('back'),
  },
} satisfies Meta<typeof ProjectDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewWorktree: Story = {};

export const Local: Story = {
  args: {
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
};

export const OnAnotherDevice: Story = {
  args: { otherDevice: otherDeviceName },
};

export const Loading: Story = { args: { project: { status: 'loading' } } };

export const Missing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
};
