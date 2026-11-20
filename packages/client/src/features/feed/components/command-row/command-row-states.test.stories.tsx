import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  commandMocks,
  commandNow,
  completedCommand,
  runningCommand,
  stoppedCommand,
} from '../tool-call.mocks';
import { CommandRow } from './command-row';
import {
  commandTitle,
  expandedAttribute,
  shellCommand,
  completedCommandTitle,
} from './command-row-play.mocks';

const meta = {
  title: 'Tests/Feed/CommandRow/States',
  component: CommandRow,
  args: { row: completedCommand },
} satisfies Meta<typeof CommandRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: { row: runningCommand, now: commandNow },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    const row = canvas.getByRole('button', {
      name: commandTitle,
    });

    await expect(row).toBeVisible();
    await expect(row).toHaveTextContent('23s');
    await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('code-text')).not.toBeInTheDocument();
    await expect(row).not.toHaveTextContent(
      'cat hello.txt && git status --short',
    );
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.click(row);
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      shellCommand,
    );
    await expect(canvas.queryByText('Completed')).not.toBeInTheDocument();
    await expect(canvas.getByText('Running')).toBeVisible();
    await userEvent.click(row);
    await waitFor(() =>
      expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
    );
  },
};

export const AgentParity: Story = {
  render: () => (
    <>
      {commandMocks.map(({ agent, row }) => (
        <CommandRow key={agent} row={row} />
      ))}
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    for (const label of [commandTitle, completedCommandTitle]) {
      const row = canvas.getByRole('button', { name: label });
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute(expandedAttribute, 'false');
      await userEvent.click(row);
      await expect(row).toHaveAttribute(expandedAttribute, 'true');
    }
  },
};

export const Stopped: Story = {
  args: { row: stoppedCommand },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    const row = canvas.getByRole('button', {
      name: 'Wait 20 seconds then print done',
    });

    await expect(row).toBeVisible();
    await expect(row).toHaveTextContent('1.5s');
    await userEvent.click(row);
    await expect(canvas.getByText('Stopped', { exact: true })).toBeVisible();
    await expect(canvas.queryByText('Completed')).not.toBeInTheDocument();
    await expect(row).toHaveTextContent(stoppedCommand.title);
    await userEvent.click(row);
    await waitFor(() =>
      expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
    );
  },
};
