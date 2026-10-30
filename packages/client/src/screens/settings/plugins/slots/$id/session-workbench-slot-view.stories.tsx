import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionWorkbenchSlot } from './slot-fixture-detail';
import { issueTrackerOff, slotPlugins } from './slot-fixtures';

const meta = {
  title: 'Screens/Settings/Plugins/Workbench cards',
  component: SlotDetailView,
  argTypes: {
    caption: { control: 'text' },
    plugins: { control: false },
    settings: { control: false },
    owner: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionWorkbenchSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: action('show in the Slot'),
    onOwnerChange: action('owner'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// One card per Plugin, stacked in Slot order under the page's switches.
export const AllOn: Story = {};

// Issue tracker hidden on this Device: its card leaves the Workbench and the rest close up.
export const IssueTrackerOff: Story = {
  args: { plugins: { status: 'loaded', plugins: issueTrackerOff } },
};
