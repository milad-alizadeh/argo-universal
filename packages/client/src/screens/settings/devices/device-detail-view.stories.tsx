import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { DeviceDetailView } from './device-detail-view';
import { pairedPhone } from './device-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Devices/Device',
  component: DeviceDetailView,
  argTypes: { device: { control: false } },
  parameters: { screenPreview: true },
  args: {
    device: pairedPhone,
    onUnpair: action('unpair'),
    onBack: action('back'),
  },
} satisfies Meta<typeof DeviceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { device: { status: 'loading' } } };

// A Device that has just been unpaired, from here or from the phone, is no longer one the Server knows.
export const Missing: Story = { args: { device: { status: 'missing' } } };
