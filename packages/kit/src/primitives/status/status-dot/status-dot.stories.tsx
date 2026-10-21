import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { StatusDot } from './status-dot';
import {
  accentStatusDot,
  dangerStatusDot,
  doneStatusDot,
  infoStatusDot,
  mutedStatusDot,
  neutralStatusDot,
  pulsingStatusDot,
  successStatusDot,
  warningStatusDot,
} from './status-dot-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/StatusDot',
  component: StatusDot,
  argTypes: kitArgTypes('StatusDot'),
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

export const Neutral: Story = { args: neutralStatusDot };

export const Muted: Story = { args: mutedStatusDot };

export const Accent: Story = { args: accentStatusDot };

export const Info: Story = { args: infoStatusDot };

export const Success: Story = { args: successStatusDot };

export const Warning: Story = { args: warningStatusDot };

export const Danger: Story = { args: dangerStatusDot };

export const Done: Story = { args: doneStatusDot };

export const Pulsing: Story = { args: pulsingStatusDot };
