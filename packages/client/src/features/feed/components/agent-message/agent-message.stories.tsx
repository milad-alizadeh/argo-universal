import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { AgentMessage } from './agent-message';
import {
  answeredMessage,
  chartAnswer,
  invalidChart,
  streamingChart,
  streamingMessage,
} from './agent-message-fixtures';

const meta = {
  title: 'Feed/AgentMessage',
  component: AgentMessage,
  // A recorded Agent message and the same row while its text streams.
  argTypes: { row: { control: false } },
  args: answeredMessage,
} satisfies Meta<typeof AgentMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

// A finished answer, as markdown on the Feed with no bubble.
export const Answered: Story = { args: answeredMessage };

// The same answer caught mid-stream, so its last block streams.
export const Streaming: Story = { args: streamingMessage };

// The Feed gives its Agent message the row's width in every rendering state.
const feedWidth: Story['decorators'] = [
  (Story) => (
    <View className="w-full">
      <Story />
    </View>
  ),
];

export const ChartAnswer: Story = { args: chartAnswer, decorators: feedWidth };

export const StreamingChart: Story = {
  args: streamingChart,
  decorators: feedWidth,
};

export const InvalidChart: Story = {
  args: invalidChart,
  decorators: feedWidth,
};
