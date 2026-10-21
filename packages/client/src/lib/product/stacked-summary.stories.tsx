import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { StackedSummary, type StackedSummaryIcon } from './stacked-summary';

const agentIcons: StackedSummaryIcon[] = [
  { icon: 'plan-mode', tone: 'done' },
  { icon: 'flask', tone: 'success' },
];

const changeIcons: StackedSummaryIcon[] = [
  { icon: 'pr-merged', tone: 'done' },
  { icon: 'pr-merged', tone: 'done' },
  { icon: 'pr-closed', tone: 'danger' },
  { icon: 'pr-open', tone: 'success' },
  { icon: 'branch', tone: 'neutral' },
];

const shellIcons: StackedSummaryIcon[] = [1, 2, 3].map(() => ({
  icon: 'terminal',
  tone: 'neutral',
}));

const meta = {
  title: 'Design System/Patterns/StackedSummary',
  component: StackedSummary,
  decorators: [
    (Story): ReactElement => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { icons: agentIcons, texts: ['2 done'] },
} satisfies Meta<typeof StackedSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

const examples = [
  { name: 'Agents', icons: agentIcons, texts: ['2 done'] },
  {
    name: 'Changes',
    icons: changeIcons,
    texts: ['2 merged', '1 closed', '1 open', '1 branch'],
  },
  { name: 'Shells', icons: shellIcons, texts: ['3 shells'] },
];

export const Overview: Story = {
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
