import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
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
  dark,
  expandedAttribute,
  shellCommand,
  completedCommandTitle,
} from './command-row-play.mocks';

const meta = {
  title: 'Tests/CommandRow',
  component: CommandRow,
  args: { row: completedCommand },
} satisfies Meta<typeof CommandRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function running(width: number): Story {
  return {
    args: { row: runningCommand, now: commandNow },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: commandTitle,
      });
      await expect(row).toBeVisible();
      await expect(row).toHaveTextContent('short git status 23s');
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await expect(
        canvas.queryByText(shellCommand, {
          exact: false,
        }),
      ).not.toBeInTheDocument();
      await expect(row).not.toHaveTextContent(
        'cat hello.txt && git status --short',
      );
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await userEvent.click(row);
      await expect(canvas.getByText('Shell')).toBeVisible();
      await expect(
        canvas.getByText(shellCommand, {
          exact: false,
        }),
      ).toBeVisible();
      await expect(canvas.queryByText('Completed')).not.toBeInTheDocument();
      await expect(canvas.getByText('Running')).toBeVisible();
      await userEvent.click(row);
      await waitFor(() =>
        expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
      );
    },
  };
}
export const RunningPhone = running(layoutWidths.phone);
export const RunningWide = running(layoutWidths.wide);

function agentParity(width: number): Story {
  return {
    render: () => (
      <>
        {commandMocks.map(({ agent, row }) => (
          <CommandRow key={agent} row={row} />
        ))}
      </>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      for (const label of [commandTitle, completedCommandTitle]) {
        const row = canvas.getByRole('button', { name: label });
        await expect(row).toBeVisible();
        await expect(row).toHaveAttribute(expandedAttribute, 'false');
        await userEvent.click(row);
        await expect(row).toHaveAttribute(expandedAttribute, 'true');
      }
    },
  };
}
export const AgentParityPhone = agentParity(layoutWidths.phone);
export const AgentParityWide = agentParity(layoutWidths.wide);

function stopped(width: number): Story {
  return {
    args: { row: stoppedCommand },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: 'Wait 20 seconds then print done',
      });
      await expect(row).toBeVisible();
      await expect(row).toHaveTextContent('done after 1.5s');
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
}
export const StoppedPhone = stopped(layoutWidths.phone);
export const StoppedWide = stopped(layoutWidths.wide);

export const RunningPhoneDark: Story = { ...RunningPhone, ...dark };
export const RunningWideDark: Story = { ...RunningWide, ...dark };
export const AgentParityPhoneDark: Story = { ...AgentParityPhone, ...dark };
export const AgentParityWideDark: Story = { ...AgentParityWide, ...dark };
export const StoppedPhoneDark: Story = { ...StoppedPhone, ...dark };
export const StoppedWideDark: Story = { ...StoppedWide, ...dark };
