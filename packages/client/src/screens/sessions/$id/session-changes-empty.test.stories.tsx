import { layoutWidths } from '@repo/kit/each-layout';
import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen } from 'storybook/test';
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

const loadErrorTitle = "Couldn't load changes";

export const NoChangesSinceMain: Story = {
  play: async () => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expect(await screen.findByText(nothingChanged)).toBeVisible();
      await expect(screen.getByText(/branched from main/)).toBeVisible();
      await expect(screen.queryByText(/viewed$/)).toBeNull();
    }
  },
};

export const LoadingShowsSpinner: Story = {
  args: { catalog: loadingChanges },
  play: async () => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
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
    beforeEach: (): Promise<void> => settleViewport(width),
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
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async () => {
      await findToast(loadErrorTitle);
      await expect(await findFileHeader(largeFile)).toBeVisible();
    },
  };
}

export const LoadErrorKeepsFilesPhone = loadErrorKeepsFiles(layoutWidths.phone);

export const LoadErrorKeepsFilesWide = loadErrorKeepsFiles(layoutWidths.wide);
