import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { ConnectionBanner } from './connection-banner';

const meta = {
  title: 'Connection/ConnectionBanner',
  component: ConnectionBanner,
} satisfies Meta<typeof ConnectionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

// An open Connection shows no banner, so only the two down states appear; the shell floats the capsule over the page.
export const Overview: Story = {
  name: 'ConnectionBanner',
  args: { state: 'reconnecting', onRetry: action('try again') },
  render: ({ onRetry }) => (
    <Variations className="max-w-none">
      {(
        [
          ['Reconnecting', 'reconnecting'],
          ['Offline', 'offline'],
        ] as const
      ).map(([label, state]) => (
        <Variation key={state} label={label}>
          <View className="w-full bg-sidebar py-3">
            <ConnectionBanner
              state={state}
              serverName="Milad's Mac mini"
              onRetry={onRetry}
            />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
