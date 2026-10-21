import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LiveHeader } from './live-header';
import {
  retryingHeader,
  thinkingHeader,
  toolCallHeader,
  waitingHeader,
  workingLiveHeader,
} from './live-header-fixtures';

const meta = {
  title: 'Feed/LiveHeader',
  component: LiveHeader,
  argTypes: {
    liveHeader: { control: false },
    toolCall: { control: false },
    now: { control: 'number' },
  },
  args: waitingHeader,
} satisfies Meta<typeof LiveHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// Waiting on you: an amber pulse and amber words, which never shimmer.
export const Waiting: Story = { args: waitingHeader };

// The retry arrow turns once a second, and holds still under reduced motion.
export const Retrying: Story = { args: retryingHeader };

// The Agent is working: the Working mark leads the shimmering line.
export const Working: Story = { args: workingLiveHeader };

// A titled thought.
export const Thinking: Story = { args: thinkingHeader };

// A running Tool call lends the line its own icon.
export const ToolCall: Story = { args: toolCallHeader };
