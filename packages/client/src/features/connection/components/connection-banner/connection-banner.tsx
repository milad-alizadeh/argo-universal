import { motionDuration } from '@repo/kit/motion';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { Text } from '@repo/kit/primitives/content/text';
import { NativeOnlyAnimatedView } from '@repo/kit/primitives/native/native-only-animated-view';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { View } from 'react-native';
import { Keyframe } from 'react-native-reanimated';
import type { ConnectionState } from '../../stores/connection';

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
    <BannerCapsule state={state} serverName={serverName} onRetry={onRetry} />
  );
}

function BannerCapsule(props: ConnectionBannerProps): React.JSX.Element {
  return (
    // Reanimated's web entering animation leaves the view absolutely placed, so only phones animate it.
    <NativeOnlyAnimatedView
      entering={entering}
      exiting={exiting}
      className="self-center"
    >
      <BannerGlass>
        <BannerStatus {...props} />
      </BannerGlass>
    </NativeOnlyAnimatedView>
  );
}

function BannerGlass({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <LiquidGlass
      corners="pill"
      className="h-9 self-center wide:h-8"
      fallbackClassName="rounded-full bg-card shadow-raised wide:shadow-card dark:border dark:border-border"
    >
      {children}
    </LiquidGlass>
  );
}

function BannerStatus({
  state,
  serverName,
  onRetry,
}: ConnectionBannerProps): React.JSX.Element {
  return (
    <View
      role="status"
      className="h-full flex-row items-center gap-2 pl-3.5 wide:pl-3"
    >
      <BannerState state={state} serverName={serverName} onRetry={onRetry} />
    </View>
  );
}

function BannerState({
  state,
  serverName,
  onRetry,
}: ConnectionBannerProps): React.JSX.Element {
  return state === 'reconnecting' ? (
    <Reconnecting />
  ) : (
    <Offline serverName={serverName} onRetry={onRetry} />
  );
}

// Desktop text takes the Body role; a phone's capsule takes Secondary, the same size one step up.
const bannerTextRole = { compact: 'secondary', wide: 'body' } as const;

function Reconnecting(): React.JSX.Element {
  return (
    <>
      <Spinner accessibilityLabel="Reconnecting" />
      <Text role={bannerTextRole} className="pr-3.5 text-foreground wide:pr-3">
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
      <OfflineMessage serverName={serverName} />
      <RetryButton onRetry={onRetry} />
    </>
  );
}

function OfflineMessage({
  serverName,
}: Pick<ConnectionBannerProps, 'serverName'>): React.JSX.Element {
  return (
    <Text
      role={bannerTextRole}
      numberOfLines={1}
      className="shrink text-foreground"
    >
      Can't reach {serverName ?? 'the Server'}
    </Text>
  );
}

function RetryButton({
  onRetry,
}: Pick<ConnectionBannerProps, 'onRetry'>): React.JSX.Element {
  return (
    // The icon sits as far from the text as from the capsule's right edge: 8px each.
    <View className="-ml-1 pr-1">
      <IconButton
        variant="ghost"
        icon="retry"
        accessibilityLabel="Try again"
        onPress={onRetry}
        size="sm"
      />
    </View>
  );
}
