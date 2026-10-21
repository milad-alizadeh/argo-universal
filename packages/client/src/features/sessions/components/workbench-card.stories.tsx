import { iconNames } from '@repo/kit/symbols/icon-names';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeDiffTotal } from './change-diff-total';
import { severalPullRequests } from './session-pull-request.mocks';
import { WorkbenchAgents } from './session-workbench-agents';
import { WorkbenchChanges } from './session-workbench-changes';
import { severalMixedSubagents } from './subagent-list/subagent-list-fixtures';
import { WorkbenchCard } from './workbench-card';

// Paper 23MD-0: Components / WorkbenchCard; Changes cell 23MP-0.
const meta = {
  title: 'Sessions/WorkbenchCard',
  component: WorkbenchCard,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <View className="m-8 w-frame-list">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    icon: { control: 'select', options: iconNames },
    summary: { control: false },
    children: { control: false },
    onOpen: { control: false },
  },
  args: {
    title: 'Changes',
    icon: 'diff',
    testID: 'workbench-changes',
    collapsible: true,
    interactive: true,
    onOpen: fn(),
    summary: <ChangeDiffTotal files={11} additions={267} deletions={61} />,
    children: <WorkbenchChanges changes={severalPullRequests} onOpen={fn()} />,
  },
} satisfies Meta<typeof WorkbenchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// Interactive: the body's own rows take the press, so the card wraps nothing around them.
export const Changes: Story = {};

// Not interactive: the whole body is one press that opens the section in Stage.
export const Agents: Story = {
  args: {
    title: 'Agents',
    icon: 'agent',
    testID: 'workbench-agents',
    interactive: false,
    summary: undefined,
    children: <WorkbenchAgents {...severalMixedSubagents} />,
  },
};

// Collapsed: the title keeps its disclosure and the body is folded away.
export const CollapsedAgents: Story = {
  args: { ...Agents.args, defaultExpanded: false },
};
