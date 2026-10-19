import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { SubagentList } from './subagent-list';
import { subagentNow, subagentStates } from './subagent-list.mocks';

const meta = {
  title: 'Sessions/SubagentList',
  component: SubagentList,
  parameters: { screenPreview: true },
  decorators: [
    (Story): JSX.Element => (
      <View className="w-full max-w-96">
        <Story />
      </View>
    ),
  ],
  args: {
    subagents: subagentStates.severalMixed,
    onSelect: action('Open Subagent Feed'),
    now: subagentNow,
  },
} satisfies Meta<typeof SubagentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeveralMixed: Story = {};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
};

export const AllFinished: Story = {
  args: { subagents: subagentStates.allFinished },
};

export const None: Story = {
  args: { subagents: subagentStates.none },
};
