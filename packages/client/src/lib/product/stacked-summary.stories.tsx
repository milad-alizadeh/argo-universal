import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { StackedSummary } from './stacked-summary';
import {
  distinctMarks,
  repeatedMarks,
  singleMark,
} from './stacked-summary-fixtures';

const meta = {
  title: 'Design System/Patterns/StackedSummary',
  component: StackedSummary,
  // A Workbench card's width, which the summary's text truncates against.
  decorators: [
    (Story): ReactElement => (
      <View className="w-frame-list">
        <Story />
      </View>
    ),
  ],
  argTypes: { icons: { control: false }, texts: { control: false } },
  args: distinctMarks,
} satisfies Meta<typeof StackedSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each mark after the first overlaps the one before it.
export const DistinctMarks: Story = { args: distinctMarks };

// A mark already in the stack is drawn once, so five Changes leave four marks.
export const RepeatedMarks: Story = { args: repeatedMarks };

// Every mark is the same, which leaves one with nothing to overlap.
export const SingleMark: Story = { args: singleMark };
