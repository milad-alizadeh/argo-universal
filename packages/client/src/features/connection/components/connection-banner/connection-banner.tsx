import type * as React from 'react';
import { View } from 'react-native';
import { Keyframe } from 'react-native-reanimated';
import { IconButton } from '#primitives/buttons/icon-button';
import { LiquidGlass } from '#primitives/display/liquid-glass';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import { motionDuration } from '../../../../lib/generic/motion';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { ConnectionState } from '../../state/connection';

export interface ConnectionBannerProps {
  state: ConnectionState;
  // The Server computer's name, once the App has heard it.
  serverName?: string;
  onRetry: () => void;
}

const slide = 8;

// Fades in while it slides down into place, and back up as it fades out.
const entering = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -slide }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(motionDuration.enter);

const exiting = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: -slide }] },
}).duration(motionDuration.exit);

// A capsule that says the Connection is down; Server data on screen may be stale until it reopens. The Frame places it over the page, so the page under it never moves.
export function ConnectionBanner({
  state,
  serverName,
  onRetry,
}: ConnectionBannerProps): React.JSX.Element | null {
  if (state !== 'reconnecting' && state !== 'offline') return null;

  return (
    // Reanimated's web entering animation leaves the view absolutely placed, so only phones animate it.
    <NativeOnlyAnimatedView
      entering={entering}
      exiting={exiting}
      className="self-center"
    >
      <LiquidGlass
        corners="capsule"
        className="h-9 self-center wide:h-8"
        fallbackClassName="rounded-full bg-card shadow-raised wide:shadow-card dark:border dark:border-border"
      >
        <View
          role="status"
          className="h-full flex-row items-center gap-2 pl-3.5 wide:pl-3"
        >
          {state === 'reconnecting' ? (
            <Reconnecting />
          ) : (
            <Offline serverName={serverName} onRetry={onRetry} />
          )}
        </View>
      </LiquidGlass>
    </NativeOnlyAnimatedView>
  );
}

// Desktop text takes the Body role; a phone's capsule takes Secondary, the same size one step up.
function useBannerTextRole(): 'body' | 'secondary' {
  return useWide() ? 'body' : 'secondary';
}

function Reconnecting(): React.JSX.Element {
  return (
    <>
      <Spinner accessibilityLabel="Reconnecting" />
      <Text
        role={useBannerTextRole()}
        className="pr-3.5 text-foreground wide:pr-3"
      >
        Reconnecting…
      </Text>
    </>
  );
}

function Offline({
  serverName,
  onRetry,
}: Pick<ConnectionBannerProps, 'serverName' | 'onRetry'>): React.JSX.Element {
  return (
    <>
      <View className="size-2 shrink-0 rounded-full bg-warning" />
      <Text
        role={useBannerTextRole()}
        numberOfLines={1}
        className="shrink text-foreground"
      >
        Can't reach {serverName ?? 'the Server'}
      </Text>
      {/* The icon sits as far from the text as from the capsule's right edge: 8px each. */}
      <View className="-ml-1 pr-1">
        <IconButton
          variant="ghost"
          icon="retry"
          iconRole="action"
          accessibilityLabel="Try again"
          onPress={onRetry}
          hitSlop={8}
          className="size-7 min-h-0 min-w-0 rounded-full android:min-h-0 android:min-w-0 sm:size-7"
        />
      </View>
    </>
  );
}
