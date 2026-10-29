import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { DiffView, type DiffViewProps } from './diff-view';

const lastAddedLine = 'new value 60';

const largeHeader = { name: 'Diff for /repo/large.txt' };

const expanded = 'aria-expanded';

const longPath =
  '/repo/assets/illustrations/a-very-long-binary-filename-for-the-inspector.png';

const longHeader = { name: `Diff for ${longPath}` };

const exampleFile = recordedFile('agent-2', 'edit-states');

const meta = {
  title: 'Tests/Feed/DiffView',
  component: DiffView,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { file: exampleFile },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

// In the Inspector a file shows every line; the Inspector scrolls, not the file.
export const InspectorFileShowsEveryLine: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleLayout(width);
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
        await settleLayout(width);
        const title = canvas.getByTestId('code-block-title');
        await expect(title.textContent).toContain('large.txt');
        // Only the folder is isolated for display; the whole path is the label assistive tech reads.
        await expect(title).toHaveAttribute('aria-label', '/repo/large.txt');
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
    await settleLayout('phone');
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

export const CutPathKeepsOneInteractiveHeader: Story = {
  args: {
    file: { ...exampleFile, path: longPath },
    viewed: false,
    onViewedChange: fn(),
  },
  render: (args) => (
    <View style={{ width: 320 }}>
      <DiffView {...args} />
    </View>
  ),
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout('wide');
    const header = canvas.getByRole('button', longHeader);
    await waitFor(() =>
      expect(header.querySelector('button')).not.toBeInTheDocument(),
    );

    const basename = canvas.getByText(
      'a-very-long-binary-filename-for-the-inspector.png',
    );

    await waitFor(() =>
      expect(basename.scrollWidth).toBeGreaterThan(basename.clientWidth),
    );
    await expect(header).toHaveAttribute(expanded, 'true');
    await expect(header).toHaveAccessibleName(`Diff for ${longPath}`);

    await userEvent.hover(header);
    await expect(
      await within(document.body).findByRole('tooltip'),
    ).toHaveTextContent(longPath);

    await userEvent.click(header);
    await expect(header).toHaveAttribute(expanded, 'false');
    await expect(args.onViewedChange).not.toHaveBeenCalled();
    header.focus();
    await expect(header).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(header).toHaveAttribute(expanded, 'true');
    await userEvent.keyboard(' ');
    await expect(header).toHaveAttribute(expanded, 'false');
    await expect(
      canvas.getByRole('checkbox', { name: 'Viewed' }),
    ).toHaveAttribute('aria-checked', 'false');
  },
};

export const PhonePathStillFoldsWithoutPopup: Story = {
  args: {
    file: { ...exampleFile, path: longPath },
  },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    const header = canvas.getByRole('button', longHeader);
    await expect(header.querySelector('button')).not.toBeInTheDocument();
    await expect(header).toHaveAttribute(expanded, 'true');
    await userEvent.click(header);
    await expect(header).toHaveAttribute(expanded, 'false');
    await expect(within(document.body).queryByRole('tooltip')).toBeNull();
  },
};
