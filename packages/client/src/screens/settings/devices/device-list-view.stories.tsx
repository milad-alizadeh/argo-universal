import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { DeviceListView } from './device-list-view';
import { onlyThisComputer, threeDevices } from './device-list-view-fixtures';

const meta = {
  title: 'Screens/Settings/Devices',
  component: DeviceListView,
  argTypes: {
    accessEnabled: { control: 'boolean' },
    pairingOffered: { control: 'boolean' },
    pairDeviceSheet: { control: false },
    devices: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    accessEnabled: true,
    devices: threeDevices,
    onPairDevice: action('open the pair sheet'),
    onUnpairDevice: action('unpair a Device'),
    onGoToConnection: action('go to Connection'),
  },
} satisfies Meta<typeof DeviceListView>;

export default meta;

type Story = StoryObj<typeof meta>;

// This computer is first and marked; each Paired Device has its own red Unpair.
export const ThreeDevices: Story = {};

export const NoOtherDevices: Story = { args: { devices: onlyThisComputer } };

export const PairingIsOff: Story = {
  args: { accessEnabled: false, devices: onlyThisComputer },
};

export const InABrowser: Story = {
  args: { pairingOffered: false, devices: onlyThisComputer },
};

export const Loading: Story = {
  args: { accessEnabled: undefined, devices: undefined },
};
