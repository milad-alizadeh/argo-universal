import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  subagentItemOf,
  subagentItems,
} from '../../../../../mocks/subagent-rows.mocks';
import { Variation, Variations } from '../../../../lib/generic/variations';
import type { FeedSubagent } from '../../view/feed-view';
import { SubagentRow } from './subagent-row';

// Each action's own word, so the variations read as the Feed words them.
const labels = {
  started: 'Started',
  messaged: 'Messaged',
  replied: 'Replied',
} as const satisfies Record<FeedSubagent['kind'], string>;

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
  args: {
    item: subagentItemOf('started'),
    onOpen: action('Open Subagent Feed'),
  },
} satisfies Meta<typeof SubagentRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every action a Subagent row draws, in Feed order.
export const Actions: Story = {
  render: (args) => (
    <Variations>
      {subagentItems.map((item) => (
        <Variation key={item.id} label={labels[item.kind]}>
          <SubagentRow item={item} onOpen={args.onOpen} />
        </Variation>
      ))}
    </Variations>
  ),
};
