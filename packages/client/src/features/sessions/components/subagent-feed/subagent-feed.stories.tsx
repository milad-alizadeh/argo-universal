import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SubagentFeed } from './subagent-feed';
import {
  SubagentFeedInspector,
  SubagentFeedSheet,
} from './subagent-feed-presentations.mocks';
import {
  emptyFeed,
  finishedFeed,
  finishedSubagent,
  noIncomingFeed,
  runningFeed,
  runningSubagent,
  startingSubagent,
  subagentFeedNow,
} from './subagent-feed.mocks';

// Paper: Feed & Inspector, SubagentFeed (owner, 2026-10-17).
const meta = {
  title: 'Sessions/SubagentFeed',
  component: SubagentFeed,
  parameters: { screenPreview: true },
  args: {
    subagent: runningSubagent,
    feed: runningFeed,
    onBack: action('Back to Subagents'),
    now: subagentFeedNow,
  },
} satisfies Meta<typeof SubagentFeed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {};

export const Finished: Story = {
  args: { subagent: finishedSubagent, feed: finishedFeed },
};

// Just spawned: nothing reported yet, so only the live row shows.
export const Empty: Story = {
  args: { subagent: startingSubagent, feed: emptyFeed },
};

export const NoIncomingMessage: Story = { args: { feed: noIncomingFeed } };

// Wide: the Inspector's Subagents tab, with Back to the list.
export const InTheInspector: Story = {
  render: (args) => <SubagentFeedInspector {...args} />,
};

// Phone: a page pushed over the Subagents list in the same Sheet.
export const AsAPageSheet: Story = {
  render: (args) => <SubagentFeedSheet {...args} />,
};
