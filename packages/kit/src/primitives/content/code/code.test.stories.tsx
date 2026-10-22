import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Code } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Code',
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
        canvas.getByRole('button', { name: 'Copy code' }).focus();
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
    code: undefined,
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

    const clipboard = spyOn(
      navigator.clipboard,
      'writeText',
    ).mockResolvedValue();

    try {
      canvas.getByRole('button', { name: 'Copy code' }).focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(clipboard).toHaveBeenCalledWith(
          '@@ -1,0 +1,6 @@\n+one\n+two\n+three\n+four\n+five\n+six',
        ),
      );
    } finally {
      clipboard.mockRestore();
    }

    await userEvent.click(
      canvas.getByRole('button', { name: 'Show all 6 lines' }),
    );
    await expect(canvas.getByText('six')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Show all 6 lines' }),
    ).not.toBeInTheDocument();
  },
};

function endInterval(end: TimerHandler | undefined): void {
  if (typeof end !== 'function') throw new Error('No interval to end');

  end();
}

// The feedback interval belongs to the latest successful copy: a second copy clears the first interval, and only the second one ends the feedback.
export const RepeatedCopyRestartsFeedback: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);

    const clipboard = spyOn(
      navigator.clipboard,
      'writeText',
    ).mockResolvedValue();

    const setTimeoutSpy = spyOn(window, 'setTimeout');

    // The calls that started a feedback interval, with the id each one returned.
    const feedback = (): { id: unknown; end: TimerHandler }[] =>
      setTimeoutSpy.mock.calls.flatMap(([handler, delay], index) =>
        delay === 2000
          ? [{ id: setTimeoutSpy.mock.results[index]?.value, end: handler }]
          : [],
      );

    const clearTimeoutSpy = spyOn(window, 'clearTimeout');

    try {
      canvas.getByRole('button', { name: 'Copy code' }).focus();
      await userEvent.keyboard('{Enter}');
      await canvas.findByRole('button', { name: 'Copied' });
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(feedback()).toHaveLength(2));
      await expect(clearTimeoutSpy).toHaveBeenCalledWith(feedback()[0]?.id);

      endInterval(feedback()[1]?.end);
      await expect(
        await canvas.findByRole('button', { name: 'Copy code' }),
      ).toBeInTheDocument();
      await expect(
        canvas.queryByRole('button', { name: 'Copied' }),
      ).not.toBeInTheDocument();
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      clipboard.mockRestore();
    }
  },
};
