import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../generic/variations';
import { StackedSummary, type SummaryMark } from './stacked-summary';

const agentMarks: SummaryMark[] = [
  { key: 'plan', icon: 'plan-mode', tone: 'done' },
  { key: 'test', icon: 'flask', tone: 'success' },
];

const changeMarks: SummaryMark[] = [
  { key: 'merged', icon: 'pr-merged', tone: 'done', surface: 'glass' },
  { key: 'merged-again', icon: 'pr-merged', tone: 'done', surface: 'glass' },
  { key: 'closed', icon: 'pr-closed', tone: 'danger', surface: 'glass' },
  { key: 'open', icon: 'pr-open', tone: 'success', surface: 'glass' },
  { key: 'branch', icon: 'branch', tone: 'neutral', surface: 'glass' },
];

const shellMarks: SummaryMark[] = ['first', 'second', 'third'].map((key) => ({
  key,
  icon: 'terminal',
  tone: 'neutral',
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
  {
    name: 'Changes',
    marks: changeMarks,
    label: '2 merged, 1 closed, 1 open, 1 branch',
  },
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
