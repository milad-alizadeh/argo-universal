import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Code } from './index';

const meta = {
  title: 'Tests/Code',
  component: Code,
  args: { code: 'const value = 42;', language: 'ts' },
} satisfies Meta<typeof Code>;

export default meta;

type Story = StoryObj<typeof meta>;

function copies(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);

      const clipboard = spyOn(
        navigator.clipboard,
        'writeText',
      ).mockResolvedValue();

      try {
        await userEvent.tab();
        await userEvent.keyboard('{Enter}');
        await waitFor(() =>
          expect(clipboard).toHaveBeenCalledWith('const value = 42;'),
        );
        await expect(
          await canvas.findByRole('button', { name: 'Copied' }),
        ).toBeVisible();
        await expect(
          await canvas.findByRole(
            'button',
            { name: 'Copy code' },
            { timeout: 3000 },
          ),
        ).toBeInTheDocument();
      } finally {
        clipboard.mockRestore();
      }
    },
  };
}

export const CopiesPhone = copies(layoutWidths.phone);

export const CopiesWide = copies(layoutWidths.wide);

export const NoTitle: Story = {
  args: { language: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByTestId('code-block-title'),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  },
};

export const ExpandsDiff: Story = {
  args: {
    diff: [
      {
        header: '@@ -1,0 +1,6 @@',
        lines: [
          { kind: 'added', number: 1, text: 'one' },
          { kind: 'added', number: 2, text: 'two' },
          { kind: 'added', number: 3, text: 'three' },
          { kind: 'added', number: 4, text: 'four' },
          { kind: 'added', number: 5, text: 'five' },
          { kind: 'added', number: 6, text: 'six' },
        ],
      },
    ],
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.queryByText('six')).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show all 6 lines' }),
    );
    await expect(canvas.getByText('six')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Show all 6 lines' }),
    ).not.toBeInTheDocument();
  },
};
