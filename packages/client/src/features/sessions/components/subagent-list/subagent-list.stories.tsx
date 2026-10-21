import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { SubagentList } from './subagent-list';
import {
  allFinishedSubagents,
  noSubagents,
  oneRunningSubagent,
  severalMixedSubagents,
} from './subagent-list-fixtures';

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
  /*
   * SubagentListProps is declared in subagent-list-types.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    subagents: {
      control: false,
      description:
        'The Session’s Subagents, kept in the order the Server spawned them.',
    },
    onSelect: {
      control: false,
      description: 'Opens that Subagent’s own Feed.',
    },
    now: { description: 'Fixed time for stories and tests.' },
  },
  args: { ...severalMixedSubagents, onSelect: action('Open Subagent Feed') },
} satisfies Meta<typeof SubagentList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Spawn order, never regrouped: a running, a waiting, a finished and a cancelled Subagent.
export const SeveralMixed: Story = { args: severalMixedSubagents };

export const OneRunning: Story = { args: oneRunningSubagent };

export const AllFinished: Story = { args: allFinishedSubagents };

// With no Subagents the list returns null, so this story draws nothing.
export const None: Story = { args: noSubagents };
