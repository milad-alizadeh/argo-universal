import { type RenderCount, renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import {
  drawnRows,
  fewChanges,
  findFileHeader,
  largeFile,
  MemoryChangesInspector,
  scrollUntil,
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
