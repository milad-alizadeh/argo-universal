import type * as React from 'react';
import { View } from 'react-native';

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

export function SessionsLoading(): React.JSX.Element {
  return (
    <View
      role="status"
      accessibilityLabel="Loading Sessions"
      // Matches the list's content padding and the rest rows, 8 apart, so nothing shifts when Sessions load.
      // Wide, this view sits outside the list, so it adds the list column's inset itself: 8 from the left, 14 from the right.
      className="gap-2 px-4 pt-5 wide:pl-2 wide:pr-3.5 wide:pt-1.5"
    >
      <SkeletonProjectHeading />
      {skeletonRowWidths.map((widths, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
        <SkeletonSessionRow key={index} widths={widths} />
      ))}
    </View>
  );
}
