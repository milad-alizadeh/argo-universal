import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentMessage } from './agent-message';
import { answeredMessage, streamingMessage } from './agent-message-fixtures';

const meta = {
  title: 'Feed/AgentMessage',
  component: AgentMessage,
  // The recorded `agent_message` row; its state decides whether the last block streams.
  argTypes: { row: { control: false } },
  args: answeredMessage,
} satisfies Meta<typeof AgentMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

// A finished answer, as markdown on the Feed with no bubble.
export const Answered: Story = { args: answeredMessage };

// The same answer caught mid-stream, so its last block streams.
export const Streaming: Story = { args: streamingMessage };
