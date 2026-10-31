import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import { settleChanges } from './session-changes-settle.test.mocks';
import {
  fewChanges,
  fileHeader,
  fileHeaders,
  findFileHeader,
  largeFile,
  MemoryChangesInspector,
  scrollToFile,
  shortFile,
} from './session-changes.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesFold',
  globals: { mode: 'light' },
  args: { catalog: fewChanges },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const expanded = 'aria-expanded';

const checked = 'aria-checked';

// The last added line of the recorded long file: the list shows every line of a file's diff.
const lastAddedLine = 'new value 60';

const diffLines = (): HTMLElement[] => screen.queryAllByTestId('diff-line');

// A file's Viewed mark, by the file's place in the list.
async function viewedMark(index: number): Promise<HTMLElement> {
  const mark = (await screen.findAllByRole('checkbox', { name: 'Viewed' }))[
    index
  ];

  if (!mark) throw new Error('Missing Viewed mark');

  return mark;
}

const tops = (): number[] =>
  fileHeaders().map((header) => header.getBoundingClientRect().top);

// The distance from each header to the next, in the order the files are listed.
const pitches = (): number[] =>
  tops()
    .slice(1)
    .map((top, index) => top - (tops()[index] ?? top));

const isOpen = (header: HTMLElement): boolean =>
  header.getAttribute(expanded) === 'true';

async function expectEvenPitch(): Promise<void> {
  const [first, ...rest] = pitches();

  await expect(first).toBeGreaterThan(0);

  for (const pitch of rest) await expect(pitch).toBeCloseTo(first ?? 0, 0);
}

// Files open when the list loads, so a reader sees every diff without a press per file.
function opensExpanded(width: number): Story {
  return {
    play: async () => {
      await settleLayout(width);
      await expect(await findFileHeader(largeFile)).toHaveAttribute(
        expanded,
        'true',
      );
      await expect(await screen.findByText(lastAddedLine)).toBeVisible();
      // A phone's list may draw the next file only once it scrolls toward it.
      await expect(await scrollToFile(shortFile)).toHaveAttribute(
        expanded,
        'true',
      );
    },
  };
}

export const OpensExpandedPhone = opensExpanded(layoutWidths.phone);

export const OpensExpandedWide = opensExpanded(layoutWidths.wide);

// Marking a file Viewed folds it, checks its mark and counts it; clearing the mark opens it and takes the count back.
function viewedFolds(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      await settleChanges(width);
      await findFileHeader(largeFile);

      const mark = await viewedMark(0);
      await expect(mark).toHaveAttribute(checked, 'false');
      await expect(await screen.findByText(lastAddedLine)).toBeVisible();
      await userEvent.click(mark);
      await expect(mark).toHaveAttribute(checked, 'true');
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
      await expect(screen.queryByText(lastAddedLine)).toBeNull();

      if (width === layoutWidths.wide)
        await expect(screen.getByText('1/4 viewed')).toBeVisible();

      await userEvent.click(mark);
      await expect(mark).toHaveAttribute(checked, 'false');
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'true');
      await expect(await screen.findByText(lastAddedLine)).toBeVisible();

      if (width === layoutWidths.wide)
        await expect(screen.getByText('0/4 viewed')).toBeVisible();
    },
  };
}

export const ViewedFoldsPhone = viewedFolds(layoutWidths.phone);

export const ViewedFoldsWide = viewedFolds(layoutWidths.wide);

// A folded file's rows leave the list and the files below move up: no blank rows stay where its diff was.
function foldLeavesNoGap(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      await settleChanges(width);
      await userEvent.click(await findFileHeader(largeFile));
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
      await expect(screen.queryByText(lastAddedLine)).toBeNull();
      // The files below move up into view and their diffs load.
      await waitFor(() => expect(diffLines().length).toBeGreaterThan(0));

      // Fold the rest too: every file is then a header alone, so every header sits one row from the next.
      for (const header of fileHeaders().filter(isOpen))
        await userEvent.click(header);

      await waitFor(() => expect(diffLines()).toHaveLength(0));
      await expectEvenPitch();
    },
  };
}

export const FoldLeavesNoGapPhone = foldLeavesNoGap(layoutWidths.phone);

export const FoldLeavesNoGapWide = foldLeavesNoGap(layoutWidths.wide);

interface Insets {
  left: number;
  right: number;
  fillsList: boolean;
}

// A file row's own side space, and whether the row runs the list's whole width.
async function headerInsets(path: string): Promise<Insets> {
  const header = await findFileHeader(path);
  const row = header.parentElement;
  const list = screen.getByTestId('changes-files');
  const mark = await viewedMark(0);

  if (!row) throw new Error('Missing file row');

  const box = row.getBoundingClientRect();
  const lane = list.getBoundingClientRect();

  return {
    left: header.getBoundingClientRect().left - box.left,
    right: box.right - mark.getBoundingClientRect().right,
    fillsList: box.left === lane.left && box.width === list.clientWidth,
  };
}

// A file row runs the list's full width with its own inset inside, the same at a phone's width and a wide window's.
export const FileRowsShareOneInset: Story = {
  play: async () => {
    await settleLayout('phone');

    const phone = await headerInsets(largeFile);

    await settleLayout('wide');

    const wide = await headerInsets(largeFile);

    for (const insets of [phone, wide]) {
      await expect(insets.fillsList).toBe(true);
      await expect(insets.left).toBeGreaterThan(0);
      await expect(insets.right).toBeCloseTo(insets.left, 0);
    }

    await expect(wide.left).toBeCloseTo(phone.left, 0);
    await expect(wide.right).toBeCloseTo(phone.right, 0);
  },
};

// Only a wider window labels the mark: a phone keeps the bare circle.
export const ViewedLabelOnlyWhenWide: Story = {
  play: async () => {
    await settleLayout('phone');
    await findFileHeader(largeFile);
    await expect(screen.queryByText('Viewed')).toBeNull();
    await settleLayout('wide');
    await expect(await screen.findAllByText('Viewed')).not.toHaveLength(0);
  },
};
