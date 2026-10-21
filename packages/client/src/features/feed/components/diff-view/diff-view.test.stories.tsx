import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { DiffView, type DiffViewProps } from './diff-view';

const lastAddedLine = 'new value 60';

const largeHeader = { name: 'Diff for /repo/large.txt' };

const expanded = 'aria-expanded';

const meta = {
  title: 'Tests/DiffView',
  component: DiffView,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { file: recordedFile('agent-2', 'edit-states') },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

// In the Inspector a file shows every line; the Inspector scrolls, not the file.
export const InspectorFileShowsEveryLine: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(canvas.queryByText(/@@/)).toBeNull();

      const header = canvas.getByRole('button', largeHeader);

      await expect(header).toHaveAttribute(expanded, 'true');
      const box = canvas.getByTestId('diff-scroll');
      await expect(box.scrollHeight).toBe(box.clientHeight);
      await expect(canvas.getByRole('button', largeHeader)).toBeVisible();
    }
  },
};

// One story per width, so the first width's "Show all" click never hides the button from the next.
function inlinePreview(width: number): Story {
  return {
    args: { inline: true },
    play: async ({ canvas, userEvent }) => {
      if (process.env.NODE_ENV !== 'test') return;

      const clipboard = spyOn(
        navigator.clipboard,
        'writeText',
      ).mockResolvedValue();

      try {
        await settleViewport(width);
        const title = canvas.getByTestId('code-block-title');
        await expect(title.textContent).toContain('/repo/large.txt');
        const header = title.parentElement;

        if (!header) throw new Error('Missing diff header');
        await page.elementLocator(header).hover();
        const copy = canvas.getByRole('button', { name: /Copy code|Copied/ });
        await expect(copy).toBeVisible();
        await userEvent.click(copy);
        await waitFor(() =>
          expect(clipboard).toHaveBeenCalledWith(
            expect.stringContaining(lastAddedLine),
          ),
        );
        await expect(
          canvas.getByRole('button', { name: 'Copied' }),
        ).toBeVisible();
        await expect(canvas.queryByText(lastAddedLine)).toBeNull();
        await userEvent.click(
          canvas.getByRole('button', { name: 'Show all 120 lines' }),
        );
        await expect(canvas.queryByText(/@@/)).toBeNull();
        const box = canvas.getByTestId('diff-scroll');
        await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
        box.scrollTop = box.scrollHeight;
        await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
        await expect(
          canvas.queryByRole('button', { name: 'Show all 120 lines' }),
        ).toBeNull();
        await expect(within(box).getByText(lastAddedLine)).toBeVisible();
      } finally {
        clipboard.mockRestore();
      }
    },
  };
}

export const InlinePreviewShowsAllPhone = inlinePreview(layoutWidths.phone);

export const InlinePreviewShowsAllWide = inlinePreview(layoutWidths.wide);

// The owner's Viewed mark can arrive after the file, as marks load after the changes; the file folds then too.
function LateViewedMark(props: DiffViewProps): React.JSX.Element {
  const [viewed, setViewed] = useState(false);

  useEffect(() => {
    const load = setTimeout((): void => setViewed(true));

    return (): void => clearTimeout(load);
  }, []);

  return <DiffView {...props} viewed={viewed} onViewedChange={setViewed} />;
}

export const ViewedMarkFromOwnerFolds: Story = {
  render: (args) => <LateViewedMark {...args} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('checkbox', { name: 'Viewed' }),
    ).toHaveAttribute('aria-checked', 'true');
    await waitFor(() =>
      expect(canvas.getByRole('button', largeHeader)).toHaveAttribute(
        expanded,
        'false',
      ),
    );
  },
};

// Clearing the mark opens the file again; the Feed's diffs, which pass no handler, have no mark at all.
export const ClearingViewedOpens: Story = {
  args: { viewed: true, onViewedChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const header = canvas.getByRole('button', largeHeader);

    await expect(header).toHaveAttribute(expanded, 'false');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Viewed' }));
    await expect(args.onViewedChange).toHaveBeenCalledWith(false);
    await expect(header).toHaveAttribute(expanded, 'true');
  },
};

export const SpaceMarksViewedPhone: Story = {
  args: { viewed: false, onViewedChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    canvas.getByRole('checkbox', { name: 'Viewed' }).focus();
    await userEvent.keyboard(' ');
    await expect(args.onViewedChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('button', largeHeader)).toHaveAttribute(
      expanded,
      'false',
    );
  },
};

export const FeedDiffHasNoViewedMark: Story = {
  args: { inline: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('code-block-title')).toBeVisible();
    await expect(canvas.queryByRole('checkbox')).toBeNull();
  },
};
