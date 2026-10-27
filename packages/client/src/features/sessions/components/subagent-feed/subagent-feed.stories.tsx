import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { SubagentFeed } from './subagent-feed';
import {
  emptySubagentFeed,
  finishedSubagentFeed,
  noIncomingMessageFeed,
  runningSubagentFeed,
} from './subagent-feed-fixtures';
import {
  SubagentFeedInspector,
  SubagentFeedSheet,
} from './subagent-feed-presentations.mocks';

// Paper: Feed & Inspector, SubagentFeed (owner, 2026-10-17).
const meta = {
  title: 'Sessions/SubagentFeed',
  component: SubagentFeed,
  parameters: { screenPreview: true },
  /*
   * SubagentFeedProps is declared in subagent-feed-props.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    subagent: {
      control: false,
      description: 'The Subagent whose Feed this is, named on the meta line.',
    },
    feed: {
      control: false,
      description:
        'The child Session’s rows, through `toSubagentFeedView`. Read-only: no Composer and no Stop.',
    },
    onBack: {
      control: false,
      description:
        'Back to the Subagents list, in the Inspector and the Sheet.',
    },
    now: { description: 'Fixes the meta line’s clock, for stories and tests.' },
  },
  args: { ...runningSubagentFeed, onBack: action('Back to Agents') },
} satisfies Meta<typeof SubagentFeed>;

export default meta;

type Story = StoryObj<typeof meta>;

// Running: the meta line counts up beside the Subagent's title.
export const Running: Story = { args: runningSubagentFeed };

// Finished: the meta line settles on how long the Subagent took.
export const Finished: Story = { args: finishedSubagentFeed };

// Just spawned: nothing reported yet, so only the live row shows.
export const Empty: Story = { args: emptySubagentFeed };

// The Agent reported no incoming message, so the Feed starts with the Subagent's own output.
export const NoIncomingMessage: Story = { args: noIncomingMessageFeed };

// Wide: the Inspector's Subagents tab, with the Feed's own header and Back to the list.
export const InTheInspector: Story = {
  render: (args) => <SubagentFeedInspector {...args} />,
};

// Phone: a page pushed over the Subagents list in the same Sheet, whose header draws Back.
export const AsAPageSheet: Story = {
  render: (args) => <SubagentFeedSheet {...args} />,
};
