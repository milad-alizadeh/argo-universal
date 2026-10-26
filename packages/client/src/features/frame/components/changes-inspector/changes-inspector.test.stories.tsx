import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { loadedChanges, manyFiles } from './changes-inspector.mocks';
import {
  allChanges,
  fewSummary,
  fileHeader,
  largeFile,
  expectComparison,
  scrollToFile,
  testMeta,
  widths,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/Frame/ChangesInspector' };

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

// Every file starts folded, so a long comparison opens fast; a header opens its diff in place.
async function expectInitialFiles(
  canvas: ReturnType<typeof within>,
): Promise<void> {
  await expect(canvas.queryByText(lastAddedLine)).toBeNull();
  await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
  await expect(fileHeader('/repo/src/feed.ts')).toHaveAttribute(
    expanded,
    'false',
  );
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
      await expectInitialFiles(canvas);
    }
  },
};

// Sixty files scroll inside the Inspector, down to the last one.
export const ManyFilesScroll: Story = {
  args: loadedChanges(manyFiles),
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByText('0/60 viewed')).toBeVisible();
      const last = await scrollToFile('/repo/src/module-60/index.ts');
      await waitFor(() => expect(last).toBeVisible());
    }
  },
};

// Marking an open file viewed folds it and tells the owner; one story per width, each with a fresh spy.
function marksViewed(width: number): Story {
  return {
    args: { onViewedChange: fn() },
    play: async ({ args, canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(fileHeader(largeFile));
      await expect(canvas.getByText(lastAddedLine)).toBeVisible();

      const [large, feed] = canvas.getAllByRole('checkbox', { name: 'Viewed' });

      if (!large || !feed) throw new Error('Missing Viewed marks');
      await expect(feed).toHaveAttribute('aria-checked', 'true');
      await userEvent.click(large);
      await expect(args.onViewedChange).toHaveBeenCalledWith(largeFile, true);
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
      await expect(canvas.queryByText(lastAddedLine)).toBeNull();
    },
  };
}

export const MarksViewedPhone = marksViewed(layoutWidths.phone);

export const MarksViewedWide = marksViewed(layoutWidths.wide);

/*
 * Expanded, the Inspector keeps the comparison, totals and files, and offers Restore in place of Expand. Only a desktop
 * expands: a phone's Changes is the sheet's page.
 */
export const ExpandedKeepsTheChanges: Story = {
  args: { expanded: true },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expectComparison(allChanges, layoutWidths.wide);
    await expect(canvas.getByText(fewSummary)).toBeVisible();
    await expect(fileHeader(largeFile)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Expand Inspector' }),
    ).toBeNull();
  },
};
