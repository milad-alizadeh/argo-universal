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

const sessionLineShapes = [
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
      {sessionLineShapes.map((shape, index) => (
        <SkeletonLine
          key={shape.slot}
          {...shape}
          bar={`${shape.bar} ${widths[index] ?? ''}`}
        />
      ))}
    </View>
  );
}

function SkeletonSessionRow({ widths }: SkeletonRowProps): React.JSX.Element {
  return (
    <View className="flex-row gap-2 px-2.5 py-3 wide:py-2">
      <SkeletonLine
        slot="h-6 wide:h-5 w-4 items-center justify-center shrink-0"
        bar="size-4 rounded-full bg-foreground/5"
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
      // Matches the list's content padding so the rows don't shift when Sessions load.
      className="px-gutter-list pt-5 wide:gap-0.5 wide:px-2"
    >
      <SkeletonProjectHeading />
      {skeletonRowWidths.map((widths, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
        <SkeletonSessionRow key={index} widths={widths} />
      ))}
    </View>
  );
}
