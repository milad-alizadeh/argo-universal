import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Text, View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import {
  type ComposerFade,
  GlassCoverProvider,
  useComposerFade,
  useReportComposerPills,
} from '#lib/product/composer-cover';
import { ComposerPillLayer } from '#lib/product/composer-pill-layer';
import type { FeedProps } from './feed';
import {
  feedScrollId,
  scrollAwayFromEnd,
  scrollToEnd,
} from './feed-reader.mocks';
import { longRows } from './feed.mocks';
import { feedArgs, PagedFeed } from './paged-feed.mocks';

interface Scene {
  // Wraps the Feed in a glass Composer's cover of this many points.
  glassCover?: number;
  // The glass Composer's measured pill row, with the gap under it.
  pillRow?: number;
  pill?: boolean;
  opensAtStart?: boolean;
}

const pillHeight = 32;

function PillRow({ height }: { height: number }): React.JSX.Element {
  const report = useReportComposerPills();

  return <View onLayout={report} style={{ height }} />;
}

function FadeReading({ atEnd }: { atEnd: boolean }): React.JSX.Element {
  const { inset, depth } = useComposerFade(atEnd);

  const id = `fade-${atEnd ? 'at-end' : 'away'}`;

  return (
    <>
      <Text testID={`${id}-inset`}>{inset}</Text>
      <Text testID={`${id}-depth`}>{depth}</Text>
    </>
  );
}

function Pill(): React.JSX.Element {
  return <View testID="pill" style={{ height: pillHeight, width: 80 }} />;
}

function Covered(
  props: Scene & { children: React.ReactNode },
): React.ReactNode {
  if (props.glassCover === undefined) return props.children;

  return (
    <GlassCoverProvider cover={props.glassCover}>
      {props.pillRow !== undefined && <PillRow height={props.pillRow} />}
      {props.children}
    </GlassCoverProvider>
  );
}

function Stage(props: Scene & { args: FeedProps }): React.JSX.Element {
  return (
    <View className="w-full">
      <View
        testID="baseline"
        className="relative w-full"
        style={{ height: 300 }}
      >
        <PagedFeed {...props.args} rows={longRows} opensAtStart />
      </View>
      <View testID="scene" className="relative w-full" style={{ height: 500 }}>
        <Covered {...props}>
          <ComposerPillLayer pill={props.pill ? <Pill /> : null}>
            <PagedFeed
              {...props.args}
              rows={longRows}
              opensAtStart={props.opensAtStart}
            />
            <FadeReading atEnd />
            <FadeReading atEnd={false} />
          </ComposerPillLayer>
        </Covered>
      </View>
    </View>
  );
}

const meta = {
  title: 'Tests/Feed/EndClearance',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const ancestorsOf = (element: HTMLElement): HTMLElement[] =>
  element.parentElement
    ? [element.parentElement, ...ancestorsOf(element.parentElement)]
    : [];

// The absolutely placed layer a control sits in, over the Feed.
function layerOf(control: HTMLElement): HTMLElement {
  const layer = ancestorsOf(control).find(
    (ancestor) => getComputedStyle(ancestor).position === 'absolute',
  );

  if (!layer) throw new Error('Control is not laid over the Feed');

  return layer;
}

const bottomOfLayer = (control: HTMLElement): number =>
  Number.parseFloat(getComputedStyle(layerOf(control)).bottom);

// The lowest text in the Feed sits this far above the end of its content when nothing is cleared below it: the last row's own padding.
const lastTextToEnd = (scroll: HTMLElement): number => {
  const texts = [...scroll.querySelectorAll<HTMLElement>('*')].filter(
    (element) => !element.children.length && element.textContent,
  );

  const lowest = Math.max(
    ...texts.map((text) => text.getBoundingClientRect().bottom),
  );

  const contentEnd =
    scroll.getBoundingClientRect().top - scroll.scrollTop + scroll.scrollHeight;

  return contentEnd - lowest;
};

interface Expected {
  // Space after the last row, which is what the Feed's end clears.
  endSpace: number;
  jumpBottom: number;
  // Null where no pill is drawn.
  pillBottom: number | null;
  fadeAtEnd: { inset: number; depth: number };
  fadeAway: { inset: number; depth: number };
}

// A Feed with no Composer and no pill clears only the Feed's own gap, so what its lowest text leaves below it beyond that is the last row's own padding.
const feedEndGapPoints = 24;

async function measureLastRowPadding(baseline: HTMLElement): Promise<number> {
  const scroll = await within(baseline).findByTestId(feedScrollId);
  let padding = 0;
  let previous = Number.NaN;
  // A Feed that opens at its start draws its end rows as the reader gets there, so it is read again until they are drawn.
  await waitFor(
    async () => {
      await scrollToEnd(scroll);
      const current = lastTextToEnd(scroll) - feedEndGapPoints;
      const settled = current === previous;
      previous = current;
      padding = current;
      await expect(settled).toBe(true);
    },
    { timeout: 15000, interval: 200 },
  );

  return padding;
}

const readFade = (
  canvas: { getByTestId: (id: string) => HTMLElement },
  id: string,
): ComposerFade => ({
  inset: Number(canvas.getByTestId(`${id}-inset`).textContent),
  depth: Number(canvas.getByTestId(`${id}-depth`).textContent),
});

// Pins every number the Feed's end learns from the Composer's cover, the pill row and the pill lift.
function pins(scene: Scene, expected: Expected): Story {
  return {
    render: () => <Stage {...scene} args={feedArgs} />,
    play: async ({ canvas: page }) => {
      await settleLayout('phone');

      const baseline = await measureLastRowPadding(
        await page.findByTestId('baseline'),
      );

      const canvas = within(await page.findByTestId('scene'));
      const scroll = await canvas.findByTestId(feedScrollId);
      await waitFor(
        async () => {
          await scrollToEnd(scroll);
          // Within a point: the baseline Feed sits at another fraction of a pixel than this one.
          await expect(
            Math.abs(lastTextToEnd(scroll) - baseline - expected.endSpace),
          ).toBeLessThan(1);
        },
        { timeout: 15000, interval: 200 },
      );
      await expect(readFade(canvas, 'fade-at-end')).toEqual(expected.fadeAtEnd);
      await expect(readFade(canvas, 'fade-away')).toEqual(expected.fadeAway);

      const pill = canvas.queryByTestId('pill');
      // Null where no pill is drawn, so a pill that should be absent fails here.
      await expect(pill ? Math.round(bottomOfLayer(pill)) : null).toBe(
        expected.pillBottom,
      );

      await scrollAwayFromEnd(canvas, scroll);

      const jump = await canvas.findByRole('button', {
        name: 'Jump to latest',
      });

      await waitFor(() =>
        expect(bottomOfLayer(jump)).toBeCloseTo(expected.jumpBottom, 0),
      );
    },
  };
}

// The Composer's overlap (48), the Feed's gap (24) and Jump to latest's gap (12), with no pill.
export const NoPill: Story = pins(
  {},
  {
    endSpace: 72,
    jumpBottom: 60,
    pillBottom: null,
    fadeAtEnd: { inset: 48, depth: 24 },
    fadeAway: { inset: 48, depth: 48 },
  },
);

// A pill lifts the Feed's end and Jump to latest by its height and gap (44), and sits above the Composer without the lift; the fade never includes the lift.
export const WithPill: Story = pins(
  { pill: true },
  {
    endSpace: 116,
    jumpBottom: 104,
    pillBottom: 60,
    fadeAtEnd: { inset: 48, depth: 24 },
    fadeAway: { inset: 48, depth: 48 },
  },
);

// A glass Composer covers its whole area; the fade runs over the measured pill row instead of above it.
export const GlassComposerWithPills: Story = pins(
  { glassCover: 120, pillRow: 40, pill: true },
  {
    endSpace: 188,
    jumpBottom: 176,
    pillBottom: 132,
    fadeAtEnd: { inset: 80, depth: 40 },
    fadeAway: { inset: 80, depth: 40 },
  },
);

// A glass Composer that measures no pills fades only a short way above its card, at the end and away from it alike.
export const GlassComposerWithoutPills: Story = pins(
  { glassCover: 120 },
  {
    endSpace: 144,
    jumpBottom: 132,
    pillBottom: null,
    fadeAtEnd: { inset: 120, depth: 24 },
    fadeAway: { inset: 120, depth: 24 },
  },
);

// A Feed read without a Composer clears none; the pill, outside the Feed, still sits above the Composer's cover.
export const FeedWithoutComposer: Story = pins(
  { pill: true, opensAtStart: true },
  {
    endSpace: 68,
    jumpBottom: 56,
    pillBottom: 60,
    fadeAtEnd: { inset: 48, depth: 24 },
    fadeAway: { inset: 48, depth: 48 },
  },
);
