import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { SubagentRow } from './subagent-row';
import {
  messagedSubagent,
  repliedSubagent,
  startedSubagent,
} from './subagent-row-fixtures';

const meta = {
  title: 'Feed/SubagentRow',
  component: SubagentRow,
  decorators: [
    (Story): JSX.Element => (
      <View className="w-full max-w-content-wide p-4">
        <Story />
      </View>
    ),
  ],
  argTypes: { item: { control: false }, onOpen: { control: false } },
  args: { ...startedSubagent, onOpen: action('Open Subagent Feed') },
} satisfies Meta<typeof SubagentRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per Subagent action. No story for a row without an opener: a Session that
 * offers no Subagent Feed drops the chevron and the button, which is the opener's absence.
 */

// The spawn: the Subagent's role avatar leads, and the prompt it began on follows underneath.
export const Started: Story = { args: startedSubagent };

// A message to the Subagent, led by the message bubble.
export const Messaged: Story = { args: messagedSubagent };

// The Subagent's reply, led by the reply arrow.
export const Replied: Story = { args: repliedSubagent };
