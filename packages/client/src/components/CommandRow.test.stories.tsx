import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
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

export const Completed: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(row).toBeVisible();
      await expect(canvas.getByText('0.3s')).toBeVisible();
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
      await expect(canvas.getByText(completedCommand.title)).toBeVisible();
      await userEvent.click(row);
      await expect(row).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() =>
        expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
      );
    }
  },
};

export const OutputDisclosure: Story = {
  args: { row: longOutputCommand },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
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
    }
  },
};

export const Failed: Story = {
  args: { row: failedCommand },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const failure = canvas.getByText('exit 2 · 0s');
      await expect(failure).toBeVisible();
      const label = canvas.getByText('Ran command');
      await expect(getComputedStyle(failure).color).not.toBe(
        getComputedStyle(label).color,
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Ran command' }),
      );
      const exit = canvas.getByText('Exit 2');
      await expect(exit).toBeVisible();
      await expect(getComputedStyle(exit).color).toBe(
        getComputedStyle(failure).color,
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Ran command' }),
      );
    }
  },
};

export const Running: Story = {
  args: { row: runningCommand, now: commandNow },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(row).toBeVisible();
      await expect(canvas.getByText('23s')).toBeVisible();
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
      await expectShimmerMovement(row);
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
    }
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
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      for (const label of [
        'Show hello.txt and short git status',
        'Ran command',
      ]) {
        const row = canvas.getByRole('button', { name: label });
        await expect(row).toBeVisible();
        await userEvent.click(row);
        await expect(row).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(row);
      }
    }
  },
};

export const Stopped: Story = {
  args: { row: stoppedCommand },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button', {
        name: 'Wait 20 seconds then print done',
      });
      await expect(row).toBeVisible();
      await expect(canvas.getByText('after 1.5s')).toBeVisible();
      await userEvent.click(row);
      await expect(canvas.getByText('Stopped', { exact: true })).toBeVisible();
      await expect(canvas.queryByText('Completed')).not.toBeInTheDocument();
      await expect(canvas.getByText(stoppedCommand.title)).toBeVisible();
      await userEvent.click(row);
      await waitFor(() =>
        expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
      );
    }
  },
};

export const CompletedDark: Story = { ...Completed, globals: { mode: 'dark' } };
export const OutputDisclosureDark: Story = {
  ...OutputDisclosure,
  globals: { mode: 'dark' },
};
export const FailedDark: Story = { ...Failed, globals: { mode: 'dark' } };
export const RunningDark: Story = { ...Running, globals: { mode: 'dark' } };
export const AgentParityDark: Story = {
  ...AgentParity,
  globals: { mode: 'dark' },
};
export const StoppedDark: Story = { ...Stopped, globals: { mode: 'dark' } };
