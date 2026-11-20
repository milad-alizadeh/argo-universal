import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { scriptedToolCall } from '../tool-call-description.mocks';
import {
  completedCommand,
  failedCommand,
  longOutputCommand,
} from '../tool-call.mocks';
import { CommandRow } from './command-row';
import {
  commandTitle,
  completedCommandTitle,
  expandedAttribute,
  shellCommand,
} from './command-row-play.mocks';

const meta = {
  title: 'Tests/Feed/CommandRow',
  component: CommandRow,
  args: { row: completedCommand },
} satisfies Meta<typeof CommandRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    const row = canvas.getByRole('button', {
      name: commandTitle,
    });

    await expect(row).toBeVisible();
    await expect(row).toHaveTextContent('0.3s');
    await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('code-text')).not.toBeInTheDocument();
    await expect(row).not.toHaveTextContent(
      'cat hello.txt && git status --short',
    );
    await expect(canvas.queryByText(/hello Argo/)).not.toBeInTheDocument();
    await expect(row).toHaveAttribute(expandedAttribute, 'false');
    await userEvent.click(row);
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      shellCommand,
    );
    await expect(canvas.getByText('Completed')).toBeVisible();
    await expect(row).toHaveTextContent(completedCommand.title);
    await userEvent.click(row);
    await expect(row).toHaveAttribute(expandedAttribute, 'false');
    await waitFor(() =>
      expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
    );
  },
};

export const CommandLabelRespondsToHover: Story = {
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    const label = canvas.getByText(commandTitle, { exact: false });
    const target = page.elementLocator(label);
    await target.unhover();
    const restingColor = getComputedStyle(label).color;

    await target.hover();
    await waitFor(() =>
      expect(getComputedStyle(label).color).not.toBe(restingColor),
    );
    await target.unhover();
    await waitFor(() =>
      expect(getComputedStyle(label).color).toBe(restingColor),
    );
  },
};

export const OutputDisclosure: Story = {
  args: { row: longOutputCommand },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    const row = canvas.getByRole('button', { name: completedCommandTitle });
    await expect(
      canvas.queryByText(/\nPreparing checks\nChecking files/, {
        normalizer: (value) => value,
      }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
    await expect(row).toHaveAccessibleName(completedCommandTitle);
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

export const Failed: Story = {
  args: { row: failedCommand },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    const failure = canvas.getByText(/exit 2/);
    await expect(failure).toBeVisible();
    await expect(canvas.queryByText('Exit 2')).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: completedCommandTitle }),
    );
    const exit = canvas.getByText('Exit 2');
    await expect(exit).toBeVisible();
  },
};

const longTitle =
  'Inspect a very long command description that must remain on a single line when the available space is narrow';

export const LongDisclosureHeader: Story = {
  args: { row: scriptedToolCall('described-long') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.phone);
    const row = canvas.getByRole('button', { name: longTitle });
    const label = canvas.getByText(longTitle, { exact: false });
    const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight);

    await expect(label.getBoundingClientRect().height).toBeLessThanOrEqual(
      lineHeight + 1,
    );
    await userEvent.click(row);
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      shellCommand,
    );
  },
};
