import { slotCounterRoot } from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from '../../../../features/settings/components/settings-pages.mocks';
import { PluginSlot } from '../../../../lib/product/plugin-registry';
import { ProjectDetailView } from './project-detail-view';

const meta = {
  title: 'Screens/Settings/Project',
  component: ProjectDetailView,
  argTypes: {
    name: { control: 'text' },
    caption: { control: 'text' },
    otherDevice: { control: 'text' },
    project: { control: false },
    renderPluginSlot: { control: false },
  },
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

// A Plugin's content in the Project details Slot, in its own titled section.
export const PluginSection: Story = {
  args: {
    renderPluginSlot: () => (
      <PluginSlot
        contributions={[
          {
            pluginId: 'hello',
            name: 'Hello',
            root: slotCounterRoot,
            onEvent: action('plugin event'),
          },
        ]}
      />
    ),
  },
};

export const OnAnotherDevice: Story = {
  args: { otherDevice: otherDeviceName },
};

export const Loading: Story = { args: { project: { status: 'loading' } } };

export const Missing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
};
