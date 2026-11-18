import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import { cdp } from 'vitest/browser';
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
const wheelStep = 120;

const downPauseMs = 25;

const upPauseMs = 60;

const reach = 8000;

// How far a stuck header's row can sit from the list's top: the list's own top padding.
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

  // The row, not its toggle: a header being pushed off still covers the top with its lower part.
  return headers().some((header) => {
    const box = cellOf(header).getBoundingClientRect();

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

// Two frames: a scroll's event, and what it moves, are drawn by the second.
const nextFrames = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
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

// Pages can take a while on a busy CI runner.
const spinnersGone = (): Promise<void> =>
  waitFor(() => expect(spinners()).toHaveLength(0), { timeout: 10_000 });

// Every header is drawn from the start, yet a far file's diff is asked for only as the reader nears it.
export const FarDiffWaitsForTheReader: Story = {
  args: { catalog: manyChanges },
  play: async () => {
    const lastFile = '/repo/src/module-60/index.ts';

    await findFileHeader(lastFile);
    await spinnersGone();
    const scroller = scrollerOf(changedFiles());

    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(() => expect(spinners().length).toBeGreaterThan(0));
    await expect(fileHeader(lastFile)).toBeInTheDocument();
    await spinnersGone();
  },
};

type Box = { path: string; top: number; bottom: number };

// Both regular and sticky Legend List cells contain layout and paint; recycling can replace one with the other.
function cellOf(header: HTMLElement): HTMLElement {
  const cell = header.closest<HTMLElement>('[style*="contain:"]');

  if (!cell) throw new Error('A file header is not inside a list cell');

  return cell;
}

const boxOf = (header: HTMLElement): Box => {
  const box = cellOf(header).getBoundingClientRect();

  return {
    path: header.getAttribute('aria-label') ?? '',
    top: Math.round(box.top),
    bottom: Math.round(box.bottom),
  };
};

// The headers drawn over another: each pair that shares rows of pixels.
function overlapping(scroller: HTMLElement): string[] {
  const view = scroller.getBoundingClientRect();

  const shown = headers()
    .map(boxOf)
    .filter((box) => box.bottom > view.top && box.top < view.bottom)
    .sort((a, b) => a.top - b.top);

  return shown.flatMap((box, index) => {
    const next = shown[index + 1];

    return next && next.top < box.bottom ? [`${box.path} / ${next.path}`] : [];
  });
}

// Steps of a third of a wheel's, so a header is caught partway through giving way.
const fineStep = wheelStep / 3;

// Past the first files' headers, stacked before their diffs land, and the handoff after a diff has: two frames a step is slow on a CI runner.
const handoffReach = 2400;

const walkingDown = (scroller: HTMLElement): boolean =>
  scroller.scrollTop < handoffReach && !atEnd(scroller);

// Each step down to `handoffReach`, past several files' headers handing over, where two headers overlap.
async function overlapsDown(scroller: HTMLElement): Promise<string[]> {
  const seen = new Set<string>();

  while (walkingDown(scroller)) {
    scroller.scrollTop += fineStep;
    await nextFrames();

    for (const pair of overlapping(scroller)) seen.add(pair);
  }

  return [...seen];
}

// A stuck header gives way to the next one: as their edges meet it is pushed up, never drawn under (#2051).
export const NextHeaderPushesTheStuckOne: Story = {
  play: async () => {
    await findFileHeader('/repo/src/file-0.ts');
    const scroller = scrollerOf(changedFiles());

    await expect(await overlapsDown(scroller)).toEqual([]);
  },
};

// More observer callbacks than one task ever needs: past this, an observer is answering its own writes.
const callbacksPerTask = 500;

interface Runaway {
  tripped: boolean;
  restore: () => void;
}

/*
 * Counts each task's MutationObserver callbacks and stops delivering them past the cap, so an observer that answers its
 * own writes fails the story instead of hanging the page it runs in.
 */
function capObservers(): Runaway {
  const Native = window.MutationObserver;

  const runaway: Runaway = {
    tripped: false,
    restore: () => {
      window.MutationObserver = Native;
    },
  };

  let calls = 0;
  let resetting = false;

  const counted =
    (callback: MutationCallback): MutationCallback =>
    (records, observer) => {
      if (!resetting) {
        resetting = true;
        setTimeout(() => {
          calls = 0;
          resetting = false;
        });
      }

      calls += 1;

      if (calls > callbacksPerTask) runaway.tripped = true;
      else callback(records, observer);
    };

  window.MutationObserver = class extends Native {
    constructor(callback: MutationCallback) {
      super(counted(callback));
    }
  };

  return runaway;
}

let runaway: Runaway | undefined;

// A Retina display zoomed to 110%: a device pixel ratio of 2.19, where a moved box's measured top wobbles in its last digits.
async function zoomTo110(): Promise<() => Promise<void>> {
  await cdp().send('Emulation.setDeviceMetricsOverride', {
    width: window.innerWidth,
    height: window.innerHeight,
    deviceScaleFactor: 2,
    mobile: false,
  });
  document.documentElement.style.zoom = '1.0957514267596702';

  return async () => {
    document.documentElement.style.zoom = '';
    await cdp().send('Emulation.clearDeviceMetricsOverride');
  };
}

// Steps that leave the list at fractional offsets, as a trackpad does.
const trackpadStep = 37.3;

const trackpadSteps = 300;

async function trackpadDown(scroller: HTMLElement): Promise<void> {
  for (let step = 0; step < trackpadSteps && !atEnd(scroller); step++) {
    scroller.scrollTop += trackpadStep;
    await nextFrames();
  }
}

// At a fractional pixel ratio a stuck header settles where it is pushed, rather than chasing its own measurement (#2092).
export const StuckHeaderSettlesWhenZoomed: Story = {
  args: { catalog: manyChanges },
  beforeEach: async () => {
    runaway = capObservers();
    const unzoom = await zoomTo110();

    return async () => {
      runaway?.restore();
      await unzoom();
    };
  },
  play: async () => {
    await findFileHeader('/repo/src/module-1/index.ts');
    await trackpadDown(scrollerOf(changedFiles()));

    await expect(runaway?.tripped).toBe(false);
  },
};
