import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  allFinishedSubagents,
  oneRunningSubagent,
  severalMixedSubagents,
} from './subagent-list-fixtures';
import { SubagentSheet } from './subagent-sheet';

const meta = {
  title: 'Sessions/SubagentSheet',
  component: SubagentSheet,
  parameters: { screenPreview: true },
  // `subagents`, `onSelect` and `now` come from subagent-list-types.ts, which docgen cannot follow.
  argTypes: {
    subagents: {
      control: false,
      description: 'The Session’s Subagents, as the sheet’s first page.',
    },
    feed: { control: false },
    onOpenChange: { control: false },
    onSelect: {
      control: false,
      description: 'Opens that Subagent’s own Feed.',
    },
    now: { description: 'Fixed time for stories and tests.' },
  },
  args: {
    ...severalMixedSubagents,
    open: true,
    onOpenChange: action('Close Subagents'),
    onSelect: action('Open Subagent Feed'),
  },
} satisfies Meta<typeof SubagentSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// The sheet's first page is the Subagents list; its second is one Subagent's Feed.
export const SeveralMixed: Story = { args: severalMixedSubagents };

export const OneRunning: Story = { args: oneRunningSubagent };

export const AllFinished: Story = { args: allFinishedSubagents };
