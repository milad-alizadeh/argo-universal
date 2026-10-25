import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { Chart } from './chart';
import { lineChart, pieChart } from './chart-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Visual/Chart',
  component: Chart,
  tags: ['!dev'],
} satisfies Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ImageWithTable: Story = {
  args: lineChart,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('img', { name: lineChart.label }),
    ).toBeVisible();

    const table = within(
      canvas.getByRole('table', { name: `${lineChart.label} data` }),
    );

    for (const { name } of lineChart.series)
      await expect(
        table.getByRole('columnheader', { name }),
      ).toBeInTheDocument();
    await expect(table.getAllByRole('row')).toHaveLength(
      new Set(
        lineChart.series.flatMap(({ points }) => points.map(({ x }) => x)),
      ).size + 1,
    );
  },
};

export const PieTable: Story = {
  args: pieChart,
  play: async ({ canvas }) => {
    const table = within(
      canvas.getByRole('table', { name: `${pieChart.label} data` }),
    );

    await expect(
      table.getByRole('columnheader', { name: 'Total' }),
    ).toBeInTheDocument();

    for (const { name } of pieChart.series)
      await expect(table.getByRole('cell', { name })).toBeInTheDocument();
  },
};

export const Press: Story = {
  args: { ...lineChart, onPress: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: lineChart.label }),
    );
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};
