import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { cdp } from 'vitest/browser';
import { readMotion } from '#mocks/motion-samples';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { sampleEachFrame } from '../../../../mocks/sample-each-frame';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
import { type Settles, SettlingContent } from './collapsible-motion-fixtures';

const toggleLabel = 'Toggle details';

const detailId = 'settling-detail';

const nextRow = 'Next row';

// Long enough for the motion and the rest after it.
const motionFrames = 40;

// One frame's move may be up to this share of the whole way: an eased 200ms motion moves about a sixth a frame, so a larger step is a jump.
const largestSmoothStep = 0.5;

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Collapsible/Motion',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Body {
  first: number;
  last: number;
  settles: Settles;
}

const settledBody: Body = { first: 120, last: 120, settles: 'on-mount' };

function renderWithRowBelow(body: Body, defaultOpen = false) {
  return () => (
    <View>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger accessibilityLabel={toggleLabel}>
          <Text>Toggle details</Text>
        </CollapsibleTrigger>
        <CollapsibleContent testID={detailId}>
          <SettlingContent {...body} />
        </CollapsibleContent>
      </Collapsible>
      <Text>{nextRow}</Text>
    </View>
  );
}

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

async function sampleRowBelow(canvas: Canvas): Promise<number[]> {
  await settleLayout('wide');
  const trigger = canvas.getByRole('button', { name: toggleLabel });
  const below = canvas.getByText(nextRow);
  const top = (): number => below.getBoundingClientRect().top;
  const before = top();
  const after = await sampleEachFrame(
    () => trigger.click(),
    top,
    motionFrames,
  );

  return [before, ...after];
}

// The row below moves one way, never past where it rests, and with no frame that jumps.
async function expectOneSmoothMotion(
  tops: readonly number[],
  travel: number,
): Promise<void> {
  const motion = readMotion(tops);
  await expect(motion.reversals).toBe(0);
  await expect(motion.overshoot).toBeLessThanOrEqual(1);
  await expect(motion.largestStepShare).toBeLessThan(largestSmoothStep);
  await expect(motion.travel).toBeCloseTo(travel, 0);
}

function opensOnce(body: Body): Story {
  return {
    render: renderWithRowBelow(body),
    play: async ({ canvas }) => {
      const tops = await sampleRowBelow(canvas);
      await expectOneSmoothMotion(tops, body.last);
    },
  };
}

// A placeholder that gives way as the content mounts: the motion heads for the height the content settles at, not the placeholder's.
export const OpensOnceWhenContentShrinksAsItMounts = opensOnce({
  first: 240,
  last: 80,
  settles: 'on-mount',
});

// Content that lays out shorter a frame after it mounts, as a late glyph does: the row below never passes where it rests and comes back.
export const OpensOnceWhenContentShrinksAfterItMounts = opensOnce({
  first: 160,
  last: 80,
  settles: 'next-frame',
});

// Content that grows a frame after it mounts, as a Plugin's tree arrives: the motion follows it there instead of snapping at the end.
export const OpensOnceWhenContentGrowsAfterItMounts = opensOnce({
  first: 40,
  last: 160,
  settles: 'next-frame',
});

export const ClosesOnceThenLeaves: Story = {
  render: renderWithRowBelow(settledBody, true),
  play: async ({ canvas }) => {
    const tops = await sampleRowBelow(canvas);
    await expectOneSmoothMotion(tops, settledBody.last);
    await waitFor(() =>
      expect(canvas.queryByTestId(detailId)).not.toBeInTheDocument(),
    );
  },
};

async function withReducedMotion(run: () => Promise<void>): Promise<void> {
  await cdp().send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });

  try {
    await run();
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  }
}

// Every frame after the press already shows where the row rests: opening and closing each take one step.
async function expectOneStep(tops: readonly number[]): Promise<void> {
  const afterPress = tops.slice(1);
  await expect(afterPress).toEqual(afterPress.map(() => tops.at(-1)));
}

export const ReducedMotionTakesOneStep: Story = {
  render: renderWithRowBelow(settledBody),
  play: async ({ canvas }) =>
    withReducedMotion(async () => {
      const opening = await sampleRowBelow(canvas);
      await expectOneStep(opening);
      const closing = await sampleRowBelow(canvas);
      await expectOneStep(closing);
      await expect(closing.at(-1)).toBeCloseTo(
        (opening.at(-1) ?? 0) - settledBody.last,
        0,
      );
      await expect(canvas.queryByTestId(detailId)).not.toBeInTheDocument();
    }),
};
