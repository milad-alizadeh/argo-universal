import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import { recordedFile } from '../../../../mocks/feed-edit-mock';
import {
  fileHeader,
  findFileHeader,
  manyChanges,
  MemoryChangesInspector,
} from './session-changes.test.mocks';

const recorded = recordedFile('agent-2', 'edit-states');

const recordedLines = recorded.hunks.flatMap((hunk) => hunk.lines);

// A Checkout's spread of file lengths, so diffs land above the reader while the list is scrolled.
const fileLines = [
  12, 40, 300, 8, 120, 60, 16, 900, 30, 45, 22, 200, 10, 75, 18, 35, 500, 14,
  28, 90, 6, 150,
];

const fileOf = (lines: number, index: number): typeof recorded => ({
  ...recorded,
  path: `/repo/src/file-${index}.ts`,
  hunks: [
    {
      header: '@@ -1 +1 @@',
      lines: Array.from(
        { length: Math.ceil(lines / recordedLines.length) },
        () => recordedLines,
      )
        .flat()
        .slice(0, lines),
    },
  ],
});

const longFiles = {
  ...manyChanges,
  files: (): (typeof recorded)[] => fileLines.map(fileOf),
};

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesSticky',
  globals: { mode: 'light' },
  args: { catalog: longFiles },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

// A wheel's steps at a wheel's pace, far enough to cross several long files inside a story's time limit.
const wheelStep = 80;

const downPauseMs = 25;

const upPauseMs = 60;

const reach = 12_000;

// How far a stuck header can sit from the list's top: the list's own top padding.
const stuckWithin = 12;

const changedFiles = (): HTMLElement => screen.getByTestId('changes-files');

function scrollerOf(list: HTMLElement): HTMLElement {
  const scroller = [list, ...list.querySelectorAll<HTMLElement>('*')].find(
    (element) => element.scrollHeight > element.clientHeight + 50,
  );

  if (!scroller) throw new Error('Changed files do not scroll');

  return scroller;
}

const headers = (): HTMLElement[] =>
  screen.queryAllByRole('button', { name: /^Diff for / });

const holdsStuckHeader = (scroller: HTMLElement): boolean => {
  const top = scroller.getBoundingClientRect().top;

  return headers().some((header) => {
    const box = header.getBoundingClientRect();

    return box.top - top <= stuckWithin && box.bottom > top;
  });
};

const atEnd = (scroller: HTMLElement): boolean =>
  scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

// One step; answers with where the list landed if no header is stuck past its top.
async function step(
  scroller: HTMLElement,
  walking: Walking,
): Promise<number[]> {
  scroller.scrollTop += walking.by;
  await walking.settle();

  return scroller.scrollTop > wheelStep && !holdsStuckHeader(scroller)
    ? [Math.round(scroller.scrollTop)]
    : [];
}

interface Walking {
  by: number;
  settle: () => Promise<void>;
  done: () => boolean;
}

async function walk(
  scroller: HTMLElement,
  walking: Walking,
): Promise<number[]> {
  const missing: number[] = [];

  while (!walking.done()) missing.push(...(await step(scroller, walking)));

  return missing;
}

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const walkDown = (scroller: HTMLElement): Promise<number[]> =>
  walk(scroller, {
    by: wheelStep,
    settle: () => pause(downPauseMs),
    done: () => scroller.scrollTop >= reach || atEnd(scroller),
  });

const walkUp = (scroller: HTMLElement): Promise<number[]> =>
  walk(scroller, {
    by: -wheelStep,
    settle: () => pause(upPauseMs),
    done: () => scroller.scrollTop <= 0,
  });

// Down to the last file and back up, past diffs that landed on the way, some header is always at the top (#1895).
export const HeaderStaysStuckBothWays: Story = {
  play: async () => {
    await findFileHeader('/repo/src/file-0.ts');
    const scroller = scrollerOf(changedFiles());

    await expect(await walkDown(scroller)).toEqual([]);
    await expect(await walkUp(scroller)).toEqual([]);
  },
};

const spinners = (): HTMLElement[] => screen.queryAllByRole('progressbar');

// Every header is drawn from the start, yet a far file's diff is asked for only as the reader nears it.
export const FarDiffWaitsForTheReader: Story = {
  args: { catalog: manyChanges },
  play: async () => {
    const lastFile = '/repo/src/module-60/index.ts';

    await findFileHeader(lastFile);
    await waitFor(() => expect(spinners()).toHaveLength(0));
    const scroller = scrollerOf(changedFiles());

    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(() => expect(spinners().length).toBeGreaterThan(0));
    await expect(fileHeader(lastFile)).toBeInTheDocument();
    await waitFor(() => expect(spinners()).toHaveLength(0));
  },
};
