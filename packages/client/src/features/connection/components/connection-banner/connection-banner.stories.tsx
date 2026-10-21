import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ConnectionBanner } from './connection-banner';
import {
  offlineBanner,
  reconnectingBanner,
} from './connection-banner-fixtures';

// The Frame floats the capsule over the page; the page under it never moves.
const meta = {
  title: 'Connection/ConnectionBanner',
  component: ConnectionBanner,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full bg-content py-3">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    state: {
      control: 'select',
      options: ['connecting', 'open', 'reconnecting', 'offline'],
    },
    serverName: { control: 'text' },
    onRetry: { control: false },
  },
  args: { ...reconnectingBanner, onRetry: action('try again') },
} satisfies Meta<typeof ConnectionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

// An open or connecting Connection shows no banner, so only the two down states draw.
export const Reconnecting: Story = { args: reconnectingBanner };

// The Server is out of reach: the Connection's dot, its name and Try again.
export const Offline: Story = { args: offlineBanner };
