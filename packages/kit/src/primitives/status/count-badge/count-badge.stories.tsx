import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { CountBadge } from './count-badge';

const meta = {
  title: 'Design System/Primitives/Status/CountBadge',
  component: CountBadge,
  args: { badge: { count: 3 } },
  // CountBadge has no Contracts schema, so its prop domain is written out here.
  argTypes: {
    badge: { control: false },
    tone: { control: 'select', options: ['danger', 'success', 'muted'] },
  },
  // The badge hugs its count, as it does at a row's end or on a rail tile.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof CountBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Count: Story = {
  args: { badge: { count: 3, label: '3 items need attention' } },
};

export const Running: Story = { args: { tone: 'success' } };

export const Finished: Story = { args: { tone: 'muted' } };

export const Over99: Story = { args: { badge: { count: 120 } } };
