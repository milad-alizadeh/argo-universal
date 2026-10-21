import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeDiffTotal } from './change-diff-total';
import { severalPullRequests } from './session-pull-request.mocks';
import { WorkbenchAgents } from './session-workbench-agents';
import { WorkbenchChanges } from './session-workbench-changes';
import {
  subagentNow,
  subagentStates,
} from './subagent-list/subagent-list.mocks';
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

export const Changes: Story = {};

export const Agents: Story = {
  args: {
    title: 'Agents',
    icon: 'agent',
    testID: 'workbench-agents',
    interactive: false,
    summary: undefined,
    children: (
      <WorkbenchAgents
        subagents={subagentStates.severalMixed}
        now={subagentNow}
      />
    ),
  },
};

export const CollapsedAgents: Story = {
  name: 'Agents · collapsed',
  args: { ...Agents.args, defaultExpanded: false },
};
