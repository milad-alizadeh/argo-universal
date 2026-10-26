import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
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

// A phone folds each file's diff under its header; a desktop lists the files and opens one at a time.
async function expectInitialFiles(
  canvas: ReturnType<typeof within>,
  width: number,
): Promise<void> {
  if (width === layoutWidths.phone) {
    await expect(canvas.getByText(lastAddedLine)).toBeVisible();
    await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'true');
    await expect(fileHeader('/repo/src/feed.ts')).toHaveAttribute(
      expanded,
      'false',
    );
  } else {
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
    await expect(fileHeader(largeFile)).toBeVisible();
    await expect(fileHeader('/repo/src/feed.ts')).not.toHaveAttribute(expanded);
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
      await expectInitialFiles(canvas, width);
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

// A phone ticks a check; a desktop toggles a button.
const checks = { role: 'checkbox', state: 'aria-checked' } as const;

const toggles = { role: 'button', state: 'aria-pressed' } as const;

// Marking a file viewed neither opens it from the desktop's list nor leaves it open on a phone.
async function expectStillFolded(
  canvas: ReturnType<typeof within>,
  width: number,
): Promise<void> {
  if (width === layoutWidths.phone)
    return expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');

  await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
}

// Marking a file viewed folds it and tells the owner; one story per width, each with a fresh spy.
function marksViewed(
  width: number,
  mark: typeof checks | typeof toggles,
): Story {
  return {
    args: { onViewedChange: fn() },
    play: async ({ args, canvas, userEvent }) => {
      await settleViewport(width);

      const [large, feed] = canvas.getAllByRole(mark.role, { name: 'Viewed' });

      if (!large || !feed) throw new Error('Missing Viewed marks');
      await expect(feed).toHaveAttribute(mark.state, 'true');
      await userEvent.click(large);
      await expect(args.onViewedChange).toHaveBeenCalledWith(largeFile, true);
      await expectStillFolded(canvas, width);
    },
  };
}

export const MarksViewedPhone = marksViewed(layoutWidths.phone, checks);

export const MarksViewedWide = marksViewed(layoutWidths.wide, toggles);

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
