import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  virtualListLeadingClasses,
  virtualListRowGeometryClasses,
  virtualListSurfaceClasses,
} from '#primitives/lists/virtual-list-item';
import type { SessionsLayout } from '../../stores/sessions-view';

const skeletonRowWidths = [
  ['w-44', 'w-30', 'w-22'],
  ['w-36', 'w-24', 'w-16'],
  ['w-49', 'w-33', 'w-26'],
  ['w-32', 'w-22', 'w-18'],
] as const;

type SkeletonRowWidths = (typeof skeletonRowWidths)[number];

// The mark both layouts lead with: the row's own leading slot, with a dot in it.
const markSlot = virtualListLeadingClasses;

const markBar = 'size-5 wide:size-4 rounded-full bg-foreground/5';

function SkeletonProjectHeading(): React.JSX.Element {
  return (
    <View className="h-10 wide:h-8 flex-row items-center gap-2 px-2.5">
      <View className="size-4 rounded-sm bg-foreground/5" />
      <View className="h-2.5 w-26 rounded-sm bg-foreground/5" />
    </View>
  );
}

interface SkeletonLineProps {
  slot: string;
  bar: string;
  testID?: string;
}

function SkeletonLine({
  slot,
  bar,
  testID,
}: SkeletonLineProps): React.JSX.Element {
  return (
    <View className={slot}>
      <View testID={testID} className={bar} />
    </View>
  );
}

interface SkeletonRowProps {
  widths: SkeletonRowWidths;
}

const sessionSkeletonLines = [
  {
    slot: 'h-6 wide-type:h-5 justify-center',
    bar: 'h-2.5 rounded-sm bg-foreground/5',
    testID: 'session-skeleton-title',
  },
  {
    slot: 'h-5 wide-type:h-4 justify-center',
    bar: 'h-2 rounded-sm bg-foreground/5',
  },
  { slot: 'h-5 justify-center pt-1', bar: 'h-2 rounded-sm bg-foreground/5' },
];

function SkeletonSessionLines({ widths }: SkeletonRowProps): React.JSX.Element {
  return (
    <View className="flex-1 gap-0.5">
      {sessionSkeletonLines.map((line, index) => (
        <SkeletonLine
          key={line.slot}
          {...line}
          bar={`${line.bar} ${widths[index] ?? ''}`}
        />
      ))}
    </View>
  );
}

function SkeletonSessionRow({ widths }: SkeletonRowProps): React.JSX.Element {
  return (
    <View className="flex-row gap-3 rounded-grouped bg-card px-4 py-3.5 wide:rounded-2xl wide:bg-transparent wide:py-2 wide:shadow-hairline">
      <SkeletonLine
        slot={markSlot}
        bar={markBar}
        testID="session-skeleton-icon"
      />
      <SkeletonSessionLines widths={widths} />
    </View>
  );
}

function SkeletonCompactTitle({ width }: { width: string }): React.JSX.Element {
  return (
    <SkeletonLine
      slot="min-w-0 flex-1 justify-center"
      bar={`h-2.5 rounded-sm bg-foreground/5 ${width}`}
      testID="session-skeleton-title"
    />
  );
}

// A Compact row: the list item's own geometry around a mark and one title line.
const compactRowClass = cn(virtualListRowGeometryClasses, 'wide:rounded-xl');

function SkeletonCompactRow({ widths }: SkeletonRowProps): React.JSX.Element {
  return (
    <View className={compactRowClass}>
      <SkeletonLine
        slot={markSlot}
        bar={markBar}
        testID="session-skeleton-icon"
      />
      <SkeletonCompactTitle width={widths[0]} />
    </View>
  );
}

// Compact: a phone groups the rows in one card; wide, they sit bare, as the list's do.
function CompactRowsSurface({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className={virtualListSurfaceClasses('only', false)}>{children}</View>
  );
}

interface SessionsLoadingProps {
  layout?: SessionsLayout;
}

function SkeletonRows({ layout }: SessionsLoadingProps): React.ReactNode {
  const compact = layout === 'compact';

  const Row = compact ? SkeletonCompactRow : SkeletonSessionRow;

  const rows = skeletonRowWidths.map((widths, index) => (
    // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
    <Row key={index} widths={widths} />
  ));

  return compact ? <CompactRowsSurface>{rows}</CompactRowsSurface> : rows;
}

export function SessionsLoading({
  layout = 'regular',
}: SessionsLoadingProps): React.JSX.Element {
  return (
    <View
      role="status"
      accessibilityLabel="Loading Sessions"
      /*
       * Matches the list's content padding and the rest rows, 8 apart, so nothing shifts when Sessions load.
       * Wide, this view sits outside the list, so it adds the list column's inset itself: 8 from the left, 14 from the right.
       */
      className="gap-2 px-4 pt-5 wide:pl-2 wide:pr-3.5 wide:pt-1.5"
    >
      <SkeletonProjectHeading />
      <SkeletonRows layout={layout} />
    </View>
  );
}
