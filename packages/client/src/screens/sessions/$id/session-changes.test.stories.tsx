import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import {
  allChanges,
  fewChanges,
  fileHeader,
  findFileHeader,
  largeFile,
  manyChanges,
  MemoryChangesInspector,
  picker,
  repeatedChanges,
  scrollToFile,
  shortFile,
} from './session-changes.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Changes',
  globals: { mode: 'light' },
  args: { catalog: fewChanges },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const expanded = 'aria-expanded';

// A file's Viewed mark, by the file's place in the list.
async function viewedMark(index: number): Promise<HTMLElement> {
  const mark = (await screen.findAllByRole('checkbox', { name: 'Viewed' }))[
    index
  ];

  if (!mark) throw new Error('Missing Viewed mark');

  return mark;
}

// The last added line of the recorded long file: the list shows every line of a file's diff.
const lastAddedLine = 'new value 60';

// Every file starts folded, so a long comparison opens fast.
async function expectFolded(): Promise<void> {
  await expect(screen.queryByText(lastAddedLine)).toBeNull();
  await expect(await findFileHeader(largeFile)).toHaveAttribute(
    expanded,
    'false',
  );
  await expect(fileHeader(shortFile)).toHaveAttribute(expanded, 'false');
}

// The Inspector's toolbar names the comparison and counts the files and their lines; a phone's sheet shows the files alone.
export const ShowsFilesAndTotalsWide: Story = {
  play: async () => {
    await settleViewport(layoutWidths.wide);
    await expect(await picker(allChanges)).toBeVisible();
    await expect(screen.getByText('0/4 viewed')).toBeVisible();
    await expect(screen.getByText('+65')).toBeVisible();
    await expect(screen.getByText('−64')).toBeVisible();
    await expectFolded();
  },
};

export const ShowsFilesPhone: Story = {
  play: async () => {
    await settleViewport(layoutWidths.phone);
    await expectFolded();
    await expect(screen.queryByText('+65')).toBeNull();
  },
};

// Sixty files scroll inside the Inspector, down to the last one.
function manyFilesScroll(width: number): Story {
  return {
    args: { catalog: manyChanges },
    play: async () => {
      await settleViewport(width);
      await findFileHeader('/repo/src/module-1/index.ts');
      const last = await scrollToFile('/repo/src/module-60/index.ts');
      await waitFor(() => expect(last).toBeVisible());
    },
  };
}

export const ManyFilesScrollPhone = manyFilesScroll(layoutWidths.phone);

export const ManyFilesScrollWide = manyFilesScroll(layoutWidths.wide);

// Marking an open file Viewed folds it and checks its mark.
function marksViewed(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      await settleViewport(width);
      await userEvent.click(await findFileHeader(largeFile));
      await expect(await screen.findByText(lastAddedLine)).toBeVisible();

      const mark = await viewedMark(0);
      await expect(mark).toHaveAttribute('aria-checked', 'false');
      await userEvent.click(mark);
      await expect(mark).toHaveAttribute('aria-checked', 'true');
      await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'false');
      await expect(screen.queryByText(lastAddedLine)).toBeNull();
    },
  };
}

export const MarksViewedPhone = marksViewed(layoutWidths.phone);

export const MarksViewedWide = marksViewed(layoutWidths.wide);

// A file's diff opens under its header, in the list: the toolbar and the other files stay, and nothing offers Back.
export const FilesOpenInPlace: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(await findFileHeader(largeFile));
    await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'true');
    await expect(await screen.findByText(lastAddedLine)).toBeVisible();
    await expect(fileHeader(shortFile)).toBeVisible();
    await expect(screen.getByText('0/4 viewed')).toBeVisible();
    await expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await userEvent.click(fileHeader(largeFile));
    await expect(screen.queryByText(lastAddedLine)).toBeNull();
  },
};

// The toolbar counts a path the Server sent twice once, and the list draws it once.
export const CountsEachPathOnce: Story = {
  args: { catalog: repeatedChanges },
  play: async ({ userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const mark = await viewedMark(0);
    await userEvent.click(mark);
    await expect(screen.getByText('1/4 viewed')).toBeVisible();
    await expect(screen.getByText('+65')).toBeVisible();
    await expect(screen.getByText('−64')).toBeVisible();
    await expect(
      screen.getAllByRole('button', { name: `Diff for ${largeFile}` }),
    ).toHaveLength(1);
  },
};

// A Viewed file stays folded like any other and opens on its header.
export const ViewedFileOpensItsDiff: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await findFileHeader(shortFile);

    const mark = await viewedMark(1);
    await userEvent.click(mark);
    await expect(screen.getByText('1/4 viewed')).toBeVisible();
    await userEvent.click(fileHeader(shortFile));
    await waitFor(() =>
      expect(screen.getAllByTestId('diff-line').length).toBeGreaterThan(0),
    );
  },
};
