import type { LegendListRef } from '@legendapp/list/react-native';
import { motionDuration } from '@repo/kit/motion';
import {
  JumpToLatestButton,
  type JumpToLatestButtonProps,
} from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { RefObject } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { overlayLayer, useFeedEndClearance } from '#lib/product/composer-cover';
import { SessionColumn } from '#lib/product/session-column';

const jumpToLatestMotion = {
  entering: FadeIn.duration(motionDuration.tooltipEnter),
  exiting: FadeOut.duration(motionDuration.exit),
  className: 'pointer-events-box-none absolute inset-x-0',
} as const;

const jumpToLatestStyle = (floatingBottom: number): ViewStyle => ({
  bottom: floatingBottom,
  zIndex: overlayLayer,
});

// Shown while the reader is away from the end; the dot marks rows that arrived since. It sits in the Composer's column, so it stays centred over the Composer.
function JumpToLatest(props: JumpToLatestButtonProps): React.JSX.Element {
  const { floatingBottom } = useFeedEndClearance();

  return (
    <Animated.View
      {...jumpToLatestMotion}
      style={jumpToLatestStyle(floatingBottom)}
    >
      <SessionColumn className="pointer-events-box-none items-center">
        <JumpToLatestButton {...props} />
      </SessionColumn>
    </Animated.View>
  );
}

interface JumpToLatestWhenAwayProps {
  list: RefObject<LegendListRef | null>;
  newestKey: string;
  // Null while the reader is at the end.
  newestKeyWhenLeftEnd: string | null;
}

export function JumpToLatestWhenAway({
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
