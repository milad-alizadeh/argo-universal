import type * as React from 'react';
import { View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Button } from '#lib/generic/primitives/buttons/button/button';
import { LiquidGlass } from '#lib/generic/primitives/display/liquid-glass/liquid-glass';
import { Spinner } from '#lib/generic/primitives/display/spinner/spinner';
import { Text } from '#lib/generic/primitives/display/text/text';
import { motionDuration } from '../../../../lib/generic/motion';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { ConnectionState } from '../../state/context';

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

// A capsule that says the Connection is down; Server data on screen may be stale until it reopens. The shell places it over the page, so the page under it never moves.
export function ConnectionBanner({
  state,
  serverName,
  onRetry,
}: ConnectionBannerProps): React.JSX.Element | null {
  if (state !== 'reconnecting' && state !== 'offline') return null;
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      className="self-center"
    >
      <LiquidGlass
        shape="capsule"
        className="h-9 wide:h-8"
        fallbackClassName="rounded-full bg-card shadow-card dark:border dark:border-border"
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
    </Animated.View>
  );
}

// Desktop text takes the Body role; a phone's capsule takes Secondary, the same size one step up.
function useBannerTextRole(): 'body' | 'secondary' {
  return useWide() ? 'body' : 'secondary';
}

function Reconnecting(): React.JSX.Element {
  return (
    <>
      <Spinner label="Reconnecting" />
      <Text role={useBannerTextRole()} className="pr-3.5 wide:pr-3">
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
      <Text role={useBannerTextRole()} numberOfLines={1} className="shrink">
        Can't reach {serverName ?? 'the Server'}
      </Text>
      <View className="pr-1">
        <Button
          appearance="content"
          variant="secondary"
          label="Try again"
          onPress={onRetry}
          className="h-7 rounded-full px-3 wide:h-6 wide:px-2.5"
          labelClassName="type-control"
        />
      </View>
    </>
  );
}
