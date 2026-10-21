import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { StatusDot } from './status-dot';

const meta = {
  title: 'Design System/Primitives/Status/StatusDot',
  component: StatusDot,
  argTypes: kitArgTypes('StatusDot'),
  args: { tone: 'success' },
  tags: ['third-party'],
  // A centred row keeps the dot at its own size, as it sits beside a row's text.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row items-center">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof StatusDot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: 'neutral' } };

export const Muted: Story = { args: { tone: 'muted' } };

export const Accent: Story = { args: { tone: 'accent' } };

export const Info: Story = { args: { tone: 'info' } };

export const Success: Story = { args: { tone: 'success' } };

export const Warning: Story = { args: { tone: 'warning' } };

export const Danger: Story = { args: { tone: 'danger' } };

export const Done: Story = { args: { tone: 'done' } };

export const Pulsing: Story = { args: { pulse: true } };
