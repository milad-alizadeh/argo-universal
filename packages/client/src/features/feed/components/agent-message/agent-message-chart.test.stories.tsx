import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import type * as React from 'react';
import { Button } from 'react-native';
import { expect, within } from 'storybook/test';
import { AgentMessage } from './agent-message';
import {
  chartAnswer,
  invalidChart,
  streamingChart,
} from './agent-message-fixtures';

const meta = {
  title: 'Tests/Feed/AgentMessage/Chart',
  component: AgentMessage,
  args: chartAnswer,
} satisfies Meta<typeof AgentMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

const chartLabel = 'Weekly deliveries';

function StreamingChart(): React.JSX.Element {
  const [closed, setClosed] = useState(false);

  return (
    <>
      <AgentMessage {...(closed ? chartAnswer : streamingChart)} streaming />
      <Button title="Close fence" onPress={() => setClosed(true)} />
    </>
  );
}

export const DrawsWhenFenceCloses: Story = {
  render: () => <StreamingChart />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(chartLabel);
    await expect(canvas.queryByRole('img', { name: chartLabel })).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: 'Close fence' }));
    await expect(
      await canvas.findByRole('img', { name: chartLabel }),
    ).toBeVisible();

    const table = within(
      await canvas.findByRole('table', { name: `${chartLabel} data` }),
    );

    await expect(
      table.getByRole('columnheader', { name: 'Delivered' }),
    ).toBeInTheDocument();
    await expect(table.getByRole('cell', { name: '26' })).toBeInTheDocument();
    await expect(canvas.queryByTestId('code-text')).toBeNull();
  },
};

export const DrawsWithoutPreview: Story = {
  play: async ({ canvas }) => {
    await settleLayout('phone');

    const image = await canvas.findByRole('img', { name: chartLabel });

    // This x-axis label appears only after the plot lays out, outside the data table.
    const axisLabel = await within(image).findByText(
      '3',
      {},
      { timeout: 10_000 },
    );

    await expect(axisLabel).toBeVisible();
  },
};

export const InvalidChartShowsSource: Story = {
  args: invalidChart,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      '"kind":"histogram"',
    );
    await expect(canvas.queryByRole('table')).toBeNull();
  },
};
