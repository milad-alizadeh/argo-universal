import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Chart } from './chart';
import {
  areaChart,
  barChart,
  donutChart,
  gridlinesLineChart,
  groupedBarChart,
  lineChart,
  pieChart,
  scatterChart,
  stackedAreaChart,
  stackedBarChart,
} from './chart-fixtures';

const meta = {
  title: 'Design System/Primitives/Visual/Chart',
  component: Chart,
  argTypes: kitArgTypes('Chart'),
  // Charts are drawn at a fixed width, as they sit in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View style={{ width: 360, maxWidth: '100%' }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = { args: lineChart };

export const Gridlines: Story = { args: gridlinesLineChart };

export const Bar: Story = { args: barChart };

export const GroupedBar: Story = { args: groupedBarChart };

export const StackedBar: Story = { args: stackedBarChart };

export const Area: Story = { args: areaChart };

export const StackedArea: Story = { args: stackedAreaChart };

export const Scatter: Story = { args: scatterChart };

export const Pie: Story = { args: pieChart };

export const Donut: Story = { args: donutChart };
