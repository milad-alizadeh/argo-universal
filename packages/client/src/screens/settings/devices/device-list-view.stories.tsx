import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { DeviceListView } from './device-list-view';

const meta = {
  title: 'Screens/Settings/Devices',
  component: DeviceListView,
  argTypes: {
    caption: { control: 'text' },
    localNetworkAccess: { control: false },
    saving: { control: 'boolean' },
    error: { control: 'text' },
    pairingOffered: { control: 'boolean' },
    pairDeviceSheet: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    localNetworkAccess: { status: 'loaded', enabled: false },
    onLocalNetworkAccessChange: action('change Local network access'),
    onRetry: action('retry loading Local network access'),
    onPairDevice: action('open the pair sheet'),
  },
} satisfies Meta<typeof DeviceListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: { localNetworkAccess: { status: 'loaded', enabled: true } },
};

export const Saving: Story = { args: { saving: true } };

export const Loading: Story = {
  args: { localNetworkAccess: { status: 'loading' } },
};

export const LoadError: Story = {
  args: { localNetworkAccess: { status: 'error' } },
};

export const Disconnected: Story = {
  args: { localNetworkAccess: { status: 'disconnected' } },
};

export const InABrowser: Story = {
  args: {
    localNetworkAccess: { status: 'loaded', enabled: true },
    pairingOffered: false,
  },
};

export const ChangeError: Story = {
  args: { error: 'Could not turn on Local network access: port in use.' },
};
