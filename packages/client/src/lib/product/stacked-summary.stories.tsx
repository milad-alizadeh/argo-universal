import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { TintedAvatar } from '../generic/tinted-avatar';
import { ToneMark } from '../generic/tone-mark';
import { Variation, Variations } from '../generic/variations';
import { StackedSummary } from './stacked-summary';

const agentMarks = [
  {
    key: 'plan',
    node: <TintedAvatar icon="plan-mode" tone="done" size="inline" />,
  },
  {
    key: 'test',
    node: <TintedAvatar icon="flask" tone="success" size="inline" />,
  },
];

const changeMarks = [
  {
    key: 'merged',
    node: <ToneMark icon="pr-merged" tone="done" form="disc" role="control" />,
  },
  {
    key: 'closed',
    node: (
      <ToneMark icon="pr-closed" tone="danger" form="disc" role="control" />
    ),
  },
];

const shellMarks = ['first', 'second', 'third'].map((key) => ({
  key,
  node: <TintedAvatar icon="terminal" tone="neutral" size="inline" />,
}));

const meta = {
  title: 'Shared/StackedSummary',
  component: StackedSummary,
  decorators: [
    (Story): ReactElement => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { marks: agentMarks, label: '2 done' },
} satisfies Meta<typeof StackedSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

const examples = [
  { name: 'Agents', marks: agentMarks, label: '2 done' },
  { name: 'Changes', marks: changeMarks, label: '1 merged, 1 closed' },
  { name: 'Shells', marks: shellMarks, label: '3 shells' },
];

export const Overview: Story = {
  name: 'StackedSummary',
  render: (): ReactElement => (
    <Variations>
      {examples.map(({ name, ...props }) => (
        <Variation key={name} label={name}>
          <View className="w-frame-list">
            <StackedSummary {...props} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
