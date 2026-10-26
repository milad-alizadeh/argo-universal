import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { sessionRowSlot } from './session-row-slot';
import { deploysOff, issueTracker, slotPlugins } from './slot-fixtures';
import { SlotSettingsView } from './slot-settings-view';

const meta = {
  title: 'Screens/Settings/Plugins/Session rows',
  component: SlotSettingsView,
  argTypes: {
    caption: { control: 'text' },
    plugins: { control: false },
    settings: { control: false },
    owner: { control: 'text' },
  },
  parameters: { screenPreview: true },
  args: {
    settings: sessionRowSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: action('show in the Slot'),
    onOwnerChange: action('part owner'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotSettingsView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllOn: Story = {};

export const IssueTrackerWritesTheLine: Story = {
  args: { owner: issueTracker.pluginId },
};

export const DeploysOff: Story = {
  args: {
    plugins: { status: 'loaded', plugins: deploysOff },
    owner: issueTracker.pluginId,
  },
};

export const Loading: Story = { args: { plugins: { status: 'loading' } } };

export const LoadError: Story = { args: { plugins: { status: 'error' } } };
