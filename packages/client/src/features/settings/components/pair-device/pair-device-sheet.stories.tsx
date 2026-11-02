import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PairDeviceSheet } from './pair-device-sheet';
import {
  expired,
  live,
  mintFailed,
  minting,
  wantsToPair,
} from './pair-device-sheet-fixtures';

const meta = {
  title: 'Settings/PairDeviceSheet',
  component: PairDeviceSheet,
  args: {
    ...live,
    onOpenChange: fn(),
    onNewCode: fn(),
    onAllow: fn(),
    onDecline: fn(),
  },
  argTypes: {
    open: { control: 'boolean' },
    code: { control: false },
    asking: { control: false },
    onOpenChange: { control: false },
    onNewCode: { control: false },
    onAllow: { control: false },
    onDecline: { control: false },
  },
} satisfies Meta<typeof PairDeviceSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = {};

export const Expired: Story = { args: expired };

export const Minting: Story = { args: minting };

export const CouldNotGetACode: Story = { args: mintFailed };

export const WantsToPair: Story = { args: wantsToPair };
