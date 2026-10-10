import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ConnectionStatePreview } from '../../../../mocks/connection-state-preview';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { ConnectionBanner } from './connection-banner';

const meta = {
  title: 'Shared/ConnectionBanner',
  component: ConnectionBanner,
} satisfies Meta<typeof ConnectionBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

// An open Connection shows no banner, so only the two down states appear.
export const Overview: Story = {
  name: 'ConnectionBanner',
  render: () => (
    <Variations className="max-w-none">
      {(
        [
          ['Reconnecting', 'reconnecting'],
          ['Offline', 'offline'],
        ] as const
      ).map(([label, state]) => (
        <Variation key={state} label={label}>
          <View className="w-full bg-background wide:bg-sidebar">
            <ConnectionStatePreview state={state}>
              <ConnectionBanner />
            </ConnectionStatePreview>
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
