import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Text, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Feed } from '../../features/feed/components/feed/feed';
import {
  feedScrollId,
  scrollAwayFromEnd,
  scrollToEnd,
} from '../../features/feed/components/feed/feed-reader.mocks';
import { longRows } from '../../features/feed/components/feed/feed.mocks';
import {
  feedArgs,
  PagedFeed,
} from '../../features/feed/components/feed/paged-feed.mocks';
import {
  GlassCoverProvider,
  useComposerFade,
  useReportComposerPills,
} from './composer-cover';
import { ComposerPillLayer } from './composer-pill-layer';

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

  return (
    <Text testID={`fade-${atEnd ? 'at-end' : 'away'}`}>
      {JSON.stringify({ inset, depth })}
    </Text>
  );
}

function Pill(): React.JSX.Element {
  return <View testID="pill" style={{ height: pillHeight, width: 80 }} />;
}

function Covered(
  props: Scene & { children: React.ReactNode },
): React.JSX.Element {
  if (props.glassCover === undefined) return <>{props.children}</>;

  return (
    <GlassCoverProvider cover={props.glassCover}>
      {props.pillRow !== undefined && <PillRow height={props.pillRow} />}
      {props.children}
    </GlassCoverProvider>
  );
}

function Stage(
  props: Scene & { args: React.ComponentProps<typeof Feed> },
): React.JSX.Element {
  return (
    <View className="relative h-[600px] w-full">
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
  );
}

const meta = {
  title: 'Tests/Design System/Patterns/ComposerCover',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

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
  const texts = Array.from(scroll.querySelectorAll<HTMLElement>('*')).filter(
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

// What the last row's own padding adds to the gap below its lowest text, measured on a Feed with no Composer and no pill (cover 0, gap 24).
const lastRowPadding = 49.25;

const readFade = (
  canvas: { getByTestId: (id: string) => HTMLElement },
  id: string,
) =>
  JSON.parse(canvas.getByTestId(id).textContent ?? '') as {
    inset: number;
    depth: number;
  };

// Pins every number the Feed's end learns from the Composer's cover, the pill row and the pill lift.
function pins(scene: Scene, expected: Expected): Story {
  return {
    render: (args) => <Stage {...scene} args={args} />,
    play: async ({ canvas }) => {
      await settleLayout('phone');
      const scroll = await canvas.findByTestId(feedScrollId);
      // A Feed that opens at its start draws its end rows as the reader gets there, so it is read again until they are drawn.
      await waitFor(
        async () => {
          await scrollToEnd(scroll);
          await expect(lastTextToEnd(scroll) - lastRowPadding).toBeCloseTo(
            expected.endSpace,
            0,
          );
        },
        { timeout: 15000, interval: 200 },
      );
      await expect(readFade(canvas, 'fade-at-end')).toEqual(expected.fadeAtEnd);
      await expect(readFade(canvas, 'fade-away')).toEqual(expected.fadeAway);

      if (expected.pillBottom === null)
        await expect(canvas.queryByTestId('pill')).toBeNull();
      else
        await expect(bottomOfLayer(canvas.getByTestId('pill'))).toBeCloseTo(
          expected.pillBottom,
          0,
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
