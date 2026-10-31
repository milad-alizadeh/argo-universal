import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionHeaderSlot } from './slot-fixture-detail';
import { issueTrackerOff, slotPlugins } from './slot-fixtures';

const meta = {
  title: 'Screens/Settings/Plugins/Session header',
  component: SlotDetailView,
  argTypes: {
    plugins: { control: false },
    settings: { control: false },
    owner: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionHeaderSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: action('show in the Slot'),
    onOwnerChange: action('owner'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The first Plugin action beside "…"; "…" holds Argo's Rename and Archive, then the Plugins' rest.
export const AllOn: Story = {};

// Issue tracker hidden on this Device: Deploys' header action takes its place beside "…".
export const IssueTrackerOff: Story = {
  args: { plugins: { status: 'loaded', plugins: issueTrackerOff } },
};
