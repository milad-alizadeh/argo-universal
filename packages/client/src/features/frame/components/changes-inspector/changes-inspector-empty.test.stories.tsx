import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import {
  fewSummary,
  fileHeader,
  largeFile,
  loadErrorTitle,
  noChanges,
  expectComparison,
  testMeta,
  widths,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/Frame/ChangesInspector/Empty' };

export default meta;

type Story = StoryObj<typeof meta>;

const loadError = "Git couldn't find main.";

// The Server's answer when the comparison holds no changed files.
const noFiles = {
  files: [],
  summary: { files: 0, additions: 0, deletions: 0 },
};

export const NoChangesSinceMain: Story = {
  args: noFiles,
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByText(noChanges)).toBeVisible();
      await expect(canvas.queryByText(/files ·/)).toBeNull();
    }
  },
};

export const NoUncommittedChanges: Story = {
  args: { ...noFiles, comparison: { kind: 'uncommitted' } },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expectComparison('Uncommitted Changes', width);
      await expect(canvas.getByText(/uncommitted/)).toBeVisible();
    }
  },
};

export const ComparedAgainstABranch: Story = {
  args: { ...noFiles, comparison: { kind: 'branch', branch: 'release/2.4' } },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expectComparison('Compare Against release/2.4', width);
      // The Comparison button names the branch too; the empty message is the other match.
      await expect(
        canvas
          .getAllByText(/release\/2\.4/)
          .filter((element) => !element.closest('button')),
      ).toHaveLength(1);
    }
  },
};

export const LoadingShowsSpinner: Story = {
  args: { files: undefined },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await expect(
        canvas.getByRole('progressbar', { name: 'Loading changes' }),
      ).toBeVisible();
      await expect(canvas.queryByText(noChanges)).toBeNull();
    }
  },
};

// A failed first load toasts once and shows neither a spinner nor an empty list.
export const LoadErrorToastsOnce: Story = {
  args: { files: undefined, loadError },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await findToast(loadErrorTitle);
      await expect(await allToasts(loadErrorTitle)).toHaveLength(1);
      await expect(canvas.queryByRole('progressbar')).toBeNull();
      await expect(canvas.queryByText(noChanges)).toBeNull();
    }
  },
};

// A failed refresh keeps the files it already had.
export const LoadErrorKeepsFiles: Story = {
  args: { loadError },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of widths) {
      await settleViewport(width);
      await findToast(loadErrorTitle);
      await expect(canvas.getByText(fewSummary)).toBeVisible();
      await expect(fileHeader(largeFile)).toBeVisible();
    }
  },
};
