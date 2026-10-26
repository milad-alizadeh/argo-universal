import type { LegendListRef } from '@legendapp/list/react-native';
import { motionDuration } from '@repo/kit/motion';
import {
  JumpToLatestButton,
  type JumpToLatestButtonProps,
} from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { RefObject } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useFeedEndClearance } from '#lib/product/composer-cover';
import { SessionColumn } from '#lib/product/session-column';

// How far Jump to latest sits above the Composer's top, on every device.
const jumpToLatestGap = 12;

const jumpToLatestMotion = {
  entering: FadeIn.duration(motionDuration.tooltipEnter),
  exiting: FadeOut.duration(motionDuration.exit),
  className: 'pointer-events-box-none absolute inset-x-0',
} as const;

// Shown while the reader is away from the end; the dot marks rows that arrived since. It sits in the Composer's column, so it stays centred over the Composer.
function JumpToLatest(props: JumpToLatestButtonProps): React.JSX.Element {
  const { composerTop } = useFeedEndClearance();

  return (
    <Animated.View
      {...jumpToLatestMotion}
      style={{ bottom: composerTop + jumpToLatestGap }}
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
