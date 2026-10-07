import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
import { settleViewport } from '../../mocks/settle-viewport';
import {
  commandMocks,
  commandNow,
  completedCommand,
  failedCommand,
  longOutputCommand,
  runningCommand,
  stoppedCommand,
} from '../../mocks/tool-call-mock';
import { CommandRow } from './CommandRow';

const meta = {
  title: 'Tests/CommandRow',
  component: CommandRow,
  args: { row: completedCommand },
} satisfies Meta<typeof CommandRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function completed(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(row).toBeVisible();
      await expect(row).toHaveTextContent('short git status 0.3s');
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await expect(
        canvas.queryByText('$ cat hello.txt && git status --short', {
          exact: false,
        }),
      ).not.toBeInTheDocument();
      await expect(row).not.toHaveTextContent(
        'cat hello.txt && git status --short',
      );
      await expect(canvas.queryByText(/hello Argo/)).not.toBeInTheDocument();
      await expect(row).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(row);
      await expect(canvas.getByText('Shell')).toBeVisible();
      await expect(
        canvas.getByText('$ cat hello.txt && git status --short', {
          exact: false,
        }),
      ).toBeVisible();
      await expect(canvas.getByText('Completed')).toBeVisible();
      await expect(row).toHaveTextContent(completedCommand.title);
      await userEvent.click(row);
      await expect(row).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() =>
        expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
      );
    },
  };
}
export const CompletedPhone = completed(layoutWidths.phone);
export const CompletedWide = completed(layoutWidths.wide);

function outputDisclosure(width: number): Story {
  return {
    args: { row: longOutputCommand },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', { name: 'Ran command' });
      await expect(
        canvas.queryByText(/\nPreparing checks\nChecking files/, {
          normalizer: (value) => value,
        }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await expect(row).toHaveAccessibleName('Ran command');
      await expect(
        canvas.queryByText(/hello Argo\n M hello.txt\n\?\? notes.md$/, {
          normalizer: (value) => value,
        }),
      ).not.toBeInTheDocument();
      await userEvent.click(row);
      await expect(canvas.getByText('Shell')).toBeVisible();
      await expect(
        canvas.getByText(/\nPreparing checks\nChecking files/, {
          normalizer: (value) => value,
        }),
      ).toBeVisible();
      await expect(canvas.getByText('Exit 0')).toBeVisible();
      await userEvent.click(row);
      await waitFor(() =>
        expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
      );
    },
  };
}
export const OutputDisclosurePhone = outputDisclosure(layoutWidths.phone);
export const OutputDisclosureWide = outputDisclosure(layoutWidths.wide);

function failed(width: number): Story {
  return {
    args: { row: failedCommand },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const failure = canvas.getByText('Ran command exit 2 · 0s');
      await expect(failure).toBeVisible();
      await expect(canvas.queryByText('Exit 2')).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Ran command' }),
      );
      const exit = canvas.getByText('Exit 2');
      await expect(exit).toBeVisible();
      await expect(getComputedStyle(exit).color).not.toBe(
        getComputedStyle(failure).color,
      );
    },
  };
}
export const FailedPhone = failed(layoutWidths.phone);
export const FailedWide = failed(layoutWidths.wide);

function running(width: number): Story {
  return {
    args: { row: runningCommand, now: commandNow },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(row).toBeVisible();
      await expect(row).toHaveTextContent('short git status 23s');
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await expect(
        canvas.queryByText('$ cat hello.txt && git status --short', {
          exact: false,
        }),
      ).not.toBeInTheDocument();
      await expect(row).not.toHaveTextContent(
        'cat hello.txt && git status --short',
      );
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expectShimmerMovement(row, '23s');
      await userEvent.click(row);
      await expect(canvas.getByText('Shell')).toBeVisible();
      await expect(
        canvas.getByText('$ cat hello.txt && git status --short', {
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
      for (const label of [
        'Show hello.txt and short git status',
        'Ran command',
      ]) {
        const row = canvas.getByRole('button', { name: label });
        await expect(row).toBeVisible();
        await expect(row).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(row);
        await expect(row).toHaveAttribute('aria-expanded', 'true');
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

export const CompletedPhoneDark: Story = {
  ...CompletedPhone,
  globals: { mode: 'dark' },
};
export const CompletedWideDark: Story = {
  ...CompletedWide,
  globals: { mode: 'dark' },
};
export const OutputDisclosurePhoneDark: Story = {
  ...OutputDisclosurePhone,
  globals: { mode: 'dark' },
};
export const OutputDisclosureWideDark: Story = {
  ...OutputDisclosureWide,
  globals: { mode: 'dark' },
};
export const FailedPhoneDark: Story = {
  ...FailedPhone,
  globals: { mode: 'dark' },
};
export const FailedWideDark: Story = {
  ...FailedWide,
  globals: { mode: 'dark' },
};
export const RunningPhoneDark: Story = {
  ...RunningPhone,
  globals: { mode: 'dark' },
};
export const RunningWideDark: Story = {
  ...RunningWide,
  globals: { mode: 'dark' },
};
export const AgentParityPhoneDark: Story = {
  ...AgentParityPhone,
  globals: { mode: 'dark' },
};
export const AgentParityWideDark: Story = {
  ...AgentParityWide,
  globals: { mode: 'dark' },
};
export const StoppedPhoneDark: Story = {
  ...StoppedPhone,
  globals: { mode: 'dark' },
};
export const StoppedWideDark: Story = {
  ...StoppedWide,
  globals: { mode: 'dark' },
};
