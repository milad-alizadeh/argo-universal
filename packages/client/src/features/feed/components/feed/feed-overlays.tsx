import type { LegendListRef } from '@legendapp/list/react-native';
import type * as React from 'react';
import type { RefObject } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { motionDuration } from '#lib/generic/motion';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { useHeaderCover } from '#lib/product/navigation/screen-header';
import { SessionColumn } from '#lib/product/session-column';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { ShimmerText } from '../shimmer-text';
import { WorkingMark } from '../working-mark';

// How far Jump to latest sits above the Composer's top, on every device.
const jumpToLatestGap = 12;

const jumpToLatestClassName =
  'size-8 items-center justify-center rounded-full border border-border bg-card shadow-[0_1px_2px_#0000000f,0_4px_12px_-4px_#00000014] active:opacity-70';

const newRowsDot = (
  <View className="absolute -top-px -right-px size-[9px] rounded-full border-2 border-card bg-info" />
);

const jumpToLatestMotion = {
  entering: FadeIn.duration(motionDuration.tooltipEnter),
  exiting: FadeOut.duration(motionDuration.exit),
  pointerEvents: 'box-none',
  className: 'absolute inset-x-0',
} as const;

interface JumpToLatestProps {
  hasNewRows: boolean;
  onPress: () => void;
}

// Shown while the reader is away from the end; the dot marks rows that arrived since. It sits in the Composer's column, so it stays centred over the Composer.
function JumpToLatest(props: JumpToLatestProps): React.JSX.Element {
  const { composerTop } = useFeedEndClearance();

  return (
    <Animated.View
      {...jumpToLatestMotion}
      style={{ bottom: composerTop + jumpToLatestGap }}
    >
      <SessionColumn pointerEvents="box-none" className="items-center">
        <JumpToLatestButton {...props} />
      </SessionColumn>
    </Animated.View>
  );
}

const jumpToLatestLabel = (hasNewRows: boolean): string =>
  hasNewRows ? 'Jump to latest, new rows' : 'Jump to latest';

function JumpToLatestButton(props: JumpToLatestProps): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={jumpToLatestLabel(props.hasNewRows)}
      onPress={props.onPress}
      className={jumpToLatestClassName}
    >
      <Icon name="arrow-down" role="control" className="text-foreground" />
      {props.hasNewRows && newRowsDot}
    </Pressable>
  );
}

function LoadingEarlier(): React.JSX.Element {
  return (
    <View
      role="progressbar"
      accessibilityLabel="Loading earlier"
      className="min-h-5 flex-row items-center justify-center gap-1.5"
    >
      <WorkingMark />
      <ShimmerText text="Loading earlier" className="type-body" />
    </View>
  );
}

// Over the list, so keeping the reading position never scrolls it out of view.
function LoadingEarlierOverlay(): React.JSX.Element {
  const headerCover = useHeaderCover();

  return (
    <View
      className="absolute top-4 self-center rounded-full bg-sidebar px-2 wide:top-6"
      // Below a transparent header, which lies over the Feed's top.
      style={{ marginTop: headerCover }}
    >
      <LoadingEarlier />
    </View>
  );
}

interface JumpToLatestWhenAwayProps {
  list: RefObject<LegendListRef | null>;
  newestKey: string;
  // Null while the reader is at the end.
  newestKeyWhenLeftEnd: string | null;
}

function JumpToLatestWhenAway({
  list,
  newestKey,
  newestKeyWhenLeftEnd,
}: JumpToLatestWhenAwayProps): React.JSX.Element | null {
  if (newestKeyWhenLeftEnd === null) return null;

  return (
    <JumpToLatest
      hasNewRows={newestKeyWhenLeftEnd !== newestKey}
      onPress={() => void list.current?.scrollToEnd({ animated: true })}
    />
  );
}

export interface FeedOverlaysProps extends JumpToLatestWhenAwayProps {
  loadingOlder: boolean;
}

export function FeedOverlays({
  loadingOlder,
  ...jump
}: FeedOverlaysProps): React.JSX.Element {
  return (
    <>
      <JumpToLatestWhenAway {...jump} />
      {loadingOlder && <LoadingEarlierOverlay />}
    </>
  );
}
