import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  completedCommand,
  failedCommand,
  longOutputCommand,
} from '../tool-call.mocks';
import { CommandRow } from './command-row';
import {
  commandTitle,
  completedCommandTitle,
  dark,
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

function completed(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);

      const row = canvas.getByRole('button', {
        name: commandTitle,
      });

      await expect(row).toBeVisible();
      await expect(row).toHaveTextContent('short git status 0.3s');
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await expect(
        canvas.queryByText(shellCommand, {
          exact: false,
        }),
      ).not.toBeInTheDocument();
      await expect(row).not.toHaveTextContent(
        'cat hello.txt && git status --short',
      );
      await expect(canvas.queryByText(/hello Argo/)).not.toBeInTheDocument();
      await expect(row).toHaveAttribute(expandedAttribute, 'false');
      await userEvent.click(row);
      await expect(canvas.getByText('Shell')).toBeVisible();
      await expect(
        canvas.getByText(shellCommand, {
          exact: false,
        }),
      ).toBeVisible();
      await expect(canvas.getByText('Completed')).toBeVisible();
      await expect(row).toHaveTextContent(completedCommand.title);
      await userEvent.click(row);
      await expect(row).toHaveAttribute(expandedAttribute, 'false');
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
        canvas.getByRole('button', { name: completedCommandTitle }),
      );
      const exit = canvas.getByText('Exit 2');
      await expect(exit).toBeVisible();
    },
  };
}

export const FailedPhone = failed(layoutWidths.phone);

export const FailedWide = failed(layoutWidths.wide);

export const CompletedPhoneDark: Story = { ...CompletedPhone, ...dark };

export const CompletedWideDark: Story = { ...CompletedWide, ...dark };

export const OutputDisclosurePhoneDark: Story = {
  ...OutputDisclosurePhone,
  ...dark,
};

export const OutputDisclosureWideDark: Story = {
  ...OutputDisclosureWide,
  ...dark,
};

export const FailedPhoneDark: Story = { ...FailedPhone, ...dark };

export const FailedWideDark: Story = { ...FailedWide, ...dark };
