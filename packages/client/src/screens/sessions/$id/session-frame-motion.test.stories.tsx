import { layoutWidths } from '@repo/kit/each-layout';
import { sampleEachFrame } from '@repo/kit/mocks/sample-each-frame';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { longSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/FrameMotion',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <FramedSessionPreview state="open" {...longSession} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The motion's longest run, 250, is about 15 frames at 60fps.
const motionFrames = 24;

type RowLayouts = Map<string, Set<string>>;

// Each mounted Feed row's laid-out box, keyed by its text: a transform leaves the box alone, a reflow changes it. The list may mount and unmount rows as it scrolls; returns how many are mounted.
function recordRows(layouts: RowLayouts): number {
  const rows = document.querySelectorAll<HTMLElement>(
    '[data-testid="feed-column"]',
  );

  for (const row of rows) recordRow(layouts, row);

  return rows.length;
}

function recordRow(layouts: RowLayouts, row: HTMLElement): void {
  const key = row.textContent ?? '';
  const sizes = layouts.get(key) ?? new Set();
  layouts.set(key, sizes.add(`${row.offsetWidth}x${row.offsetHeight}`));
}

// The rows that took more than one layout across the frames of the motion the toggle just started.
async function reflowedRows(): Promise<string[]> {
  const layouts: RowLayouts = new Map();
  await sampleEachFrame(
    () => {},
    () => recordRows(layouts),
    motionFrames,
  );

  return [...layouts].flatMap(([key, sizes]) =>
    sizes.size > 1 ? [`${key.slice(0, 40)}: ${[...sizes].join(' ')}`] : [],
  );
}

// FLIP: the page takes its new width at once, so each Feed row lays out once and only slides while the sidebar collapses and expands.
export const FeedLaysOutOnceWhileTheSidebarMoves: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await canvas.findAllByTestId('feed-column');

    for (const name of ['Hide sidebar', 'Show sidebar']) {
      await userEvent.click(canvas.getByRole('button', { name }));

      await expect(await reflowedRows()).toEqual([]);
    }
  },
};
