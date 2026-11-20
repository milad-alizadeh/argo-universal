import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionRowSlot } from './slot-fixture-detail';
import { deploysOff, slotPlugins } from './slot-fixtures';

const meta = {
  title: 'Screens/Settings/Plugins/Session rows',
  component: SlotDetailView,
  argTypes: {
    plugins: { control: false },
    settings: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionRowSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    onShownChange: action('show in the Slot'),
    onBack: action('back'),
  },
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllOn: Story = {};

export const DeploysOff: Story = {
  args: {
    plugins: { status: 'loaded', plugins: deploysOff },
  },
};

export const Loading: Story = { args: { plugins: { status: 'loading' } } };

export const LoadError: Story = { args: { plugins: { status: 'error' } } };
