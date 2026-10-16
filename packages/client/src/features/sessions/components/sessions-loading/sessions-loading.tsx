import type * as React from 'react';
import { View } from 'react-native';
import type { SessionsLayout } from '../../state/sessions-layout';

const skeletonRowWidths = [
  ['w-44', 'w-30', 'w-22'],
  ['w-36', 'w-24', 'w-16'],
  ['w-49', 'w-33', 'w-26'],
  ['w-32', 'w-22', 'w-18'],
] as const;

type SkeletonRowWidths = (typeof skeletonRowWidths)[number];

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
    slot: 'h-6 wide:h-5 justify-center',
    bar: 'h-2.5 rounded-sm bg-foreground/5',
    testID: 'session-skeleton-title',
  },
  {
    slot: 'h-5 wide:h-4 justify-center',
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
        slot="size-6 wide:size-5 items-center justify-center shrink-0"
        bar="size-5 wide:size-4 rounded-full bg-foreground/5"
        testID="session-skeleton-icon"
      />
      <SkeletonSessionLines widths={widths} />
    </View>
  );
}

// A Compact row: the list item's leading slot and one title line, with its trailing slot's width kept.
function SkeletonCompactRow({ widths }: SkeletonRowProps): React.JSX.Element {
  return (
    <View className="min-h-11 flex-row items-center gap-3 px-4 py-2.75 android:min-h-14 android:gap-4 android:py-2 wide:min-h-8 wide:rounded-xl wide:py-0 wide:pl-4 wide:pr-3">
      <SkeletonLine
        slot="size-6 wide:size-5 items-center justify-center shrink-0"
        bar="size-5 wide:size-4 rounded-full bg-foreground/5"
        testID="session-skeleton-icon"
      />
      <SkeletonLine
        slot="min-w-0 flex-1 justify-center"
        bar={`h-2.5 rounded-sm bg-foreground/5 ${widths[0]}`}
        testID="session-skeleton-title"
      />
    </View>
  );
}

// Compact: a phone groups the rows in one card; wide, they sit bare, as the list's do.
function SkeletonCompactRows(): React.JSX.Element {
  return (
    <View className="overflow-hidden rounded-grouped bg-card wide:rounded-none wide:bg-transparent">
      {skeletonRowWidths.map((widths, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
        <SkeletonCompactRow key={index} widths={widths} />
      ))}
    </View>
  );
}

function SkeletonRegularRows(): React.JSX.Element {
  return (
    <>
      {skeletonRowWidths.map((widths, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
        <SkeletonSessionRow key={index} widths={widths} />
      ))}
    </>
  );
}

export function SessionsLoading({
  layout = 'regular',
}: {
  layout?: SessionsLayout;
}): React.JSX.Element {
  return (
    <View
      role="status"
      accessibilityLabel="Loading Sessions"
      // Matches the list's content padding and the rest rows, 8 apart, so nothing shifts when Sessions load.
      // Wide, this view sits outside the list, so it adds the list column's inset itself: 8 from the left, 14 from the right.
      className="gap-2 px-4 pt-5 wide:pl-2 wide:pr-3.5 wide:pt-1.5"
    >
      <SkeletonProjectHeading />
      {layout === 'compact' ? <SkeletonCompactRows /> : <SkeletonRegularRows />}
    </View>
  );
}
