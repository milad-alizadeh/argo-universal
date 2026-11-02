import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionRowSlot } from './slot-fixture-detail';
import { deploysOff, issueTracker, slotPlugins } from './slot-fixtures';

const meta = {
  title: 'Screens/Settings/Plugins/Session rows',
  component: SlotDetailView,
  argTypes: {
    plugins: { control: false },
    settings: { control: false },
    owner: { control: 'text' },
  },
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionRowSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: action('show in the Slot'),
    onOwnerChange: action('Activity line owner'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotDetailView>;

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
