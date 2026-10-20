import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { manyFiles } from './changes-inspector.mocks';
import {
  allChanges,
  fewSummary,
  fileHeader,
  largeFile,
  expectComparison,
  testMeta,
  widths,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/ChangesInspector' };

export default meta;

type Story = StoryObj<typeof meta>;

const expanded = 'aria-expanded';

// The last added line of the recorded long file: the Inspector shows every line of a file's diff.
const lastAddedLine = 'new value 60';

async function expectLineTotals(
  canvas: ReturnType<typeof within>,
  width: number,
): Promise<void> {
  if (width === layoutWidths.wide) {
    await expect(canvas.getByText('+65')).toBeVisible();
    await expect(canvas.getByText('−64')).toBeVisible();
  } else {
    await expect(canvas.queryByText('+65')).toBeNull();
    await expect(canvas.queryByText('−64')).toBeNull();
  }
}

// The toolbar counts every file and its lines; a viewed file starts folded.
export const ShowsFilesAndTotals: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expectComparison(allChanges, width);
      await expect(canvas.getByText(fewSummary)).toBeVisible();
      await expectLineTotals(canvas, width);
      await expect(canvas.getByText(lastAddedLine)).toBeVisible();
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'true');
      await expect(fileHeader('/repo/src/feed.ts')).toHaveAttribute(
        expanded,
        'false',
      );
    }
  },
};

// Sixty files scroll inside the Inspector, down to the last one.
export const ManyFilesScroll: Story = {
  args: { files: manyFiles },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByText('60 files · 0 viewed')).toBeVisible();
      const last = fileHeader('/repo/src/module-60/index.ts');
      last.scrollIntoView();
      await waitFor(() => expect(last).toBeVisible());
    }
  },
};

// Marking a file viewed folds it and tells the owner; one story per width, each with a fresh spy.
function marksViewed(width: number): Story {
  return {
    args: { onViewedChange: fn() },
    play: async ({ args, canvas, userEvent }) => {
      await settleViewport(width);
      const [large, feed] = canvas.getAllByRole('checkbox', { name: 'Viewed' });

      if (!large || !feed) throw new Error('Missing Viewed checkboxes');
      await expect(feed).toHaveAttribute('aria-checked', 'true');
      await userEvent.click(large);
      await expect(args.onViewedChange).toHaveBeenCalledWith(largeFile, true);
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
    },
  };
}

export const MarksViewedPhone = marksViewed(layoutWidths.phone);

export const MarksViewedWide = marksViewed(layoutWidths.wide);

// Expanded, the Inspector keeps the comparison, totals and files, and offers Restore in place of Expand.
export const ExpandedKeepsTheChanges: Story = {
  args: { expanded: true },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expectComparison(allChanges, width);
      await expect(canvas.getByText(fewSummary)).toBeVisible();
      await expect(fileHeader(largeFile)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Restore Inspector' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Expand Inspector' }),
      ).toBeNull();
    }
  },
};
