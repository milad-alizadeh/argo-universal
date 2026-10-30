import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, within } from 'storybook/test';
import {
  binaryChanges,
  binaryPath,
  movedFrom,
  movedTo,
  renamedChanges,
} from './session-changes-empty.test.mocks';
import {
  findFileHeader,
  largeFile,
  loadingChanges,
  MemoryChangesInspector,
  noChanges,
  staleChanges,
  unloadableChanges,
  widths,
} from './session-changes.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesEmpty',
  globals: { mode: 'light' },
  args: { catalog: noChanges },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const nothingChanged = 'No changes';

const noLines = 'No lines to show';

const cantPreview = /can't be previewed/;

const loadErrorTitle = "Couldn't load changes";

export const NoChangesSinceMain: Story = {
  play: async () => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleLayout(width);
      await expect(await screen.findByText(nothingChanged)).toBeVisible();
      await expect(screen.getByText(/branched from main/)).toBeVisible();
      await expect(screen.queryByText(/viewed$/)).toBeNull();
    }
  },
};

// A binary file remains accessible by its full path while its status can fold and reopen; it never claims an empty text diff.
function binaryFile(width: number): Story {
  return {
    args: { catalog: binaryChanges },
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ userEvent }) => {
      const header = await findFileHeader(binaryPath);
      const mark = screen.getByRole('checkbox', { name: 'Viewed' });
      const headerBounds = header.getBoundingClientRect();
      const markBounds = mark.getBoundingClientRect();

      await expect(header).toHaveAccessibleName(`Diff for ${binaryPath}`);
      await expect(mark).toBeVisible();
      await expect(headerBounds.right).toBeLessThanOrEqual(markBounds.left);

      if (width === layoutWidths.wide) {
        const basename = screen.getByText(binaryPath.split('/').at(-1) ?? '');

        await expect(basename.scrollWidth).toBeGreaterThan(
          basename.clientWidth,
        );
      }

      await expect(await screen.findByText(cantPreview)).toBeVisible();
      await expect(screen.queryByText(noLines)).toBeNull();
      await userEvent.click(mark);
      await expect(header).toHaveAttribute('aria-expanded', 'false');
      await expect(screen.queryByText(cantPreview)).toBeNull();
      await userEvent.click(mark);
      await expect(await screen.findByText(cantPreview)).toBeVisible();
    },
  };
}

export const BinaryFilePhone = binaryFile(layoutWidths.phone);

export const BinaryFileWide = binaryFile(layoutWidths.wide);

// A moved file reads as where it was and where it is, not as its new path alone.
function renamedFile(width: number): Story {
  return {
    args: { catalog: renamedChanges },
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async () => {
      const header = await findFileHeader(movedTo);

      await expect(header).toBeVisible();
      // A phone's scrolling path carries no accessibility label, and a wide one wraps its folder in direction marks, so
      // each path is read by the name it draws.
      for (const path of [movedFrom, movedTo]) {
        await expect(
          within(header).getByText(path.slice(path.lastIndexOf('/') + 1)),
        ).toBeVisible();
      }
    },
  };
}

export const RenamedFilePhone = renamedFile(layoutWidths.phone);

export const RenamedFileWide = renamedFile(layoutWidths.wide);

export const LoadingShowsSpinner: Story = {
  args: { catalog: loadingChanges },
  play: async () => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleLayout(width);
      await expect(
        await screen.findByRole('progressbar', { name: 'Loading changes' }),
      ).toBeVisible();
      await expect(screen.queryByText(nothingChanged)).toBeNull();
    }
  },
};

// A failed first load toasts once and shows neither a spinner nor an empty list.
function loadErrorToastsOnce(width: number): Story {
  return {
    args: { catalog: unloadableChanges },
    // Set before the first draw: a phone draws its sheet afresh, which would toast again.
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async () => {
      await findToast(loadErrorTitle);
      await expect(await allToasts(loadErrorTitle)).toHaveLength(1);
      await expect(
        screen.queryByRole('progressbar', { name: 'Loading changes' }),
      ).toBeNull();
      await expect(screen.queryByText(nothingChanged)).toBeNull();
    },
  };
}

export const LoadErrorToastsOncePhone = loadErrorToastsOnce(layoutWidths.phone);

export const LoadErrorToastsOnceWide = loadErrorToastsOnce(layoutWidths.wide);

// A failed refresh keeps the files it already had.
function loadErrorKeepsFiles(width: number): Story {
  return {
    args: { catalog: staleChanges },
    // Set before the first draw: a phone draws its sheet afresh, which would toast again.
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async () => {
      await findToast(loadErrorTitle);
      await expect(await findFileHeader(largeFile)).toBeVisible();
    },
  };
}

export const LoadErrorKeepsFilesPhone = loadErrorKeepsFiles(layoutWidths.phone);

export const LoadErrorKeepsFilesWide = loadErrorKeepsFiles(layoutWidths.wide);
