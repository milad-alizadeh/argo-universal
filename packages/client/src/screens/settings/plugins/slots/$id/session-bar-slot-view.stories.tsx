import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionBarSlot } from './slot-fixture-detail';
import { issueTracker, slotPlugins } from './slot-fixtures';

const meta = {
  title: 'Screens/Settings/Plugins/Session bar',
  component: SlotDetailView,
  argTypes: {
    plugins: { control: false },
    settings: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionBarSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: action('show on the Session bar'),
    onOwnerChange: action('owner'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Issue tracker comes first in Slot order, so its line shows; the other two wait behind "+2".
export const AllOn: Story = {};

// With Issue tracker off, Deploys comes next and takes the line.
export const IssueTrackerOff: Story = {
  args: {
    plugins: {
      status: 'loaded',
      plugins: slotPlugins.map((plugin) =>
        plugin.pluginId === issueTracker.pluginId
          ? { ...plugin, shown: false }
          : plugin,
      ),
    },
  },
};

// Every Plugin off: the Session page draws no bar.
export const AllOff: Story = {
  args: {
    plugins: {
      status: 'loaded',
      plugins: slotPlugins.map((plugin) => ({ ...plugin, shown: false })),
    },
  },
};
