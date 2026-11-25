import { type RenderCount, renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import {
  drawnRows,
  fewChanges,
  fileHeader,
  findFileHeader,
  hundredsFirstFile,
  hundredsOfChanges,
  largeFile,
  MemoryChangesInspector,
  scrollUntil,
  shortFile,
} from './session-changes.test.mocks';

const renders = renderCounter();

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesRenders',
  globals: { mode: 'light' },
  args: { catalog: { ...fewChanges, linesPerPage: 20 } },
  render: (args): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <MemoryChangesInspector {...args} />
    </Profiler>
  ),
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

// The last added line of the long file, pages past what first loads.
const lastAddedLine = 'new value 60';

const diffLines = (): HTMLElement[] => screen.queryAllByTestId('diff-line');

const updatesOf = (count?: RenderCount): object[] => count?.updates ?? [];

// Another page of the long file draws that page; the rows already drawn, and every other file's, stay as they were.
export const DiffPageDrawsOnlyItsOwnRows: Story = {
  play: async ({ canvasElement }) => {
    await findFileHeader(largeFile);
    await waitFor(() => expect(diffLines().length).toBeGreaterThan(0));
    // Pages can take a while on a busy CI runner.
    await waitFor(
      () => expect(screen.queryAllByRole('progressbar')).toHaveLength(0),
      { timeout: 10_000 },
    );

    const counts = await renders.during(canvasElement, () =>
      scrollUntil(drawnRows, () => screen.queryByText(lastAddedLine) !== null),
    );

    await expect(updatesOf(counts.PageRow)).toEqual([]);
    await expect(updatesOf(counts.HeaderRow)).toEqual([]);
  },
};

// The path of each row that rendered again, so a test can say which file's row it was.
const pathsOf = (count?: RenderCount): string[] =>
  updatesOf(count).flatMap((props) => {
    const { path } = JSON.parse(JSON.stringify(props)).item.file;

    return typeof path === 'string' ? [path] : [];
  });

const otherFiles = (count?: RenderCount): string[] =>
  pathsOf(count).filter((path) => path !== shortFile);

async function settled(): Promise<void> {
  await findFileHeader(shortFile);
  await waitFor(
    () => expect(screen.queryAllByRole('progressbar')).toHaveLength(0),
    { timeout: 10_000 },
  );
}

// The Viewed mark beside a file's header: the nearest ancestor of the header that holds one.
function markOf(header: HTMLElement): HTMLElement {
  for (let row = header.parentElement; row; row = row.parentElement) {
    const mark = within(row).queryByRole('checkbox', { name: 'Viewed' });

    if (mark) return mark;
  }

  throw new Error('Missing Viewed mark');
}

const isOpen = (open: boolean): Promise<void> =>
  waitFor(() =>
    expect(fileHeader(shortFile)).toHaveAttribute(
      'aria-expanded',
      String(open),
    ),
  );

// Folding or opening one file draws that file's header; no other file's header or diff page draws again.
export const FoldingOneFileDrawsOnlyItsHeader: Story = {
  play: async ({ canvasElement }) => {
    await settled();

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(fileHeader(shortFile));
      await isOpen(false);
      await userEvent.click(fileHeader(shortFile));
      await isOpen(true);
    });

    await expect(otherFiles(counts.PageRow)).toEqual([]);
    await expect(otherFiles(counts.HeaderRow)).toEqual([]);
    await expect(pathsOf(counts.HeaderRow)).toContain(shortFile);
  },
};

// Marking one file Viewed folds it, and draws only its own header.
export const MarkingOneFileViewedDrawsOnlyItsHeader: Story = {
  play: async ({ canvasElement }) => {
    await settled();

    const mark = markOf(await findFileHeader(shortFile));

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(mark);
      await isOpen(false);
    });

    await expect(otherFiles(counts.PageRow)).toEqual([]);
    await expect(otherFiles(counts.HeaderRow)).toEqual([]);
    await expect(pathsOf(counts.HeaderRow)).toContain(shortFile);
  },
};

// Among 120 files, folding the first draws its header alone; the other files' headers and diffs stay as drawn.
export const FoldingOneOfManyFilesDrawsOnlyItsHeader: Story = {
  args: { catalog: hundredsOfChanges },
  play: async ({ canvasElement }) => {
    await findFileHeader(hundredsFirstFile);
    await waitFor(
      () => expect(screen.queryAllByRole('progressbar')).toHaveLength(0),
      { timeout: 10_000 },
    );

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(fileHeader(hundredsFirstFile));
      await waitFor(() =>
        expect(fileHeader(hundredsFirstFile)).toHaveAttribute(
          'aria-expanded',
          'false',
        ),
      );
    });

    await expect(updatesOf(counts.PageRow)).toEqual([]);
    await expect(new Set(pathsOf(counts.HeaderRow))).toEqual(
      new Set([hundredsFirstFile]),
    );
    // The list draws only the rows near the reader, not every page of 120 files.
    await expect(screen.queryAllByTestId('diff-line').length).toBeLessThan(120);
  },
};
