import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeRow } from './change-row';
import { pullRequestMocks } from './session-pull-request.mocks';

// Paper 24GB-0: Components / ChangeRow, including the checks donut states.
const meta = {
  title: 'Sessions/ChangeRow',
  component: ChangeRow,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <View className="w-frame-list">
          <Story />
        </View>
      </View>
    ),
  ],
  args: { change: pullRequestMocks.checksRunning, onOpen: fn() },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChecksRunning: Story = {
  args: { change: pullRequestMocks.checksRunning },
};

export const ChecksFailing: Story = {
  args: { change: pullRequestMocks.checksFailing },
};

export const ChecksPassed: Story = {
  args: { change: pullRequestMocks.checksPassed },
};

export const Draft: Story = {
  args: { change: pullRequestMocks.followUp },
};

export const Merged: Story = {
  args: { change: pullRequestMocks.merged },
};

export const Closed: Story = {
  args: { change: pullRequestMocks.closed },
};
