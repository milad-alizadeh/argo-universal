import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import {
  drawnRows,
  fileHeader,
  findFileHeader,
  largeFile,
  MemoryChangesInspector,
  pagedChanges,
  scrollUntil,
  shortFile,
} from './session-changes.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesPaging',
  globals: { mode: 'light' },
  args: { catalog: pagedChanges },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const lastFile = '/repo/src/module-60/index.ts';

const lastAddedLine = 'new value 60';

const diffLines = (): HTMLElement[] => screen.queryAllByTestId('diff-line');

// Every file opens, so the long file's lines are the drawn lines above the next file's header.
function largeFileLines(): HTMLElement[] {
  const next = screen.queryByRole('button', { name: `Diff for ${shortFile}` });
  const end = next?.getBoundingClientRect().top ?? Infinity;

  return diffLines().filter(
    (line) => line.getBoundingClientRect().bottom <= end,
  );
}

// The toolbar counts the whole comparison while the files arrive twenty at a time, until the last.
export const FilesArriveInPages: Story = {
  play: async () => {
    await findFileHeader(largeFile);
    await expect(screen.getByText('0/64 viewed')).toBeVisible();
    await expect(
      screen.queryByRole('button', { name: `Diff for ${lastFile}` }),
    ).toBeNull();
    await scrollUntil(
      drawnRows,
      () => screen.queryByLabelText('Loading more files') !== null,
    );
    await scrollUntil(
      drawnRows,
      () =>
        screen.queryByRole('button', { name: `Diff for ${lastFile}` }) !== null,
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Loading more files')).toBeNull(),
    );
  },
};

// An open diff shows its first page of lines, then the next as its end scrolls into view, down to its last line.
export const DiffArrivesInPages: Story = {
  play: async () => {
    await findFileHeader(largeFile);
    await waitFor(() => expect(diffLines().length).toBeGreaterThan(0));
    await expect(screen.queryByText(lastAddedLine)).toBeNull();
    await scrollUntil(
      largeFileLines,
      () => screen.queryByText(lastAddedLine) !== null,
    );
    await expect(fileHeader(largeFile)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
};
