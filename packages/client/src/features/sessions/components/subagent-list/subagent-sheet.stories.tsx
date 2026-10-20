import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { subagentNow, subagentStates } from './subagent-list.mocks';
import { SubagentSheet } from './subagent-sheet';

const meta = {
  title: 'Sessions/SubagentSheet',
  component: SubagentSheet,
  parameters: { screenPreview: true },
  args: {
    subagents: subagentStates.severalMixed,
    open: true,
    onOpenChange: action('Close Subagents'),
    onSelect: action('Open Subagent Feed'),
    now: subagentNow,
  },
} satisfies Meta<typeof SubagentSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeveralMixed: Story = {};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
};

export const AllFinished: Story = {
  args: { subagents: subagentStates.allFinished },
};
