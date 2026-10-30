import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useCallback } from 'react';
import { Animated, View } from 'react-native';
import {
  ConnectionBanner,
  retryServer,
  useConnection,
  useConnectionState,
  useTRPC,
} from '#features/connection';

// A Server the desktop App started may be gone, not only out of reach, so Try again asks for one again as well.
function useRetry(): () => void {
  const connection = useConnection();

  return useCallback((): void => {
    retryServer();
    connection.retry();
  }, [connection]);
}

// The App's Connection banner: the live state, the Server's name from its last system.info, and Try again. A wide window floats it over the panes.
export function LiveConnectionBanner(): React.JSX.Element | null {
  const state = useConnectionState();
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const retry = useRetry();

  return (
    <ConnectionBanner
      state={state}
      serverName={info.data?.name}
      onRetry={retry}
    />
  );
}

export interface PhoneConnectionBannerProps {
  // The height of a header that floats over the page (`headerTransparent`), as the stack reports it, so the banner moves down by it; without one, the page already starts under its header.
  headerHeight?: Animated.AnimatedInterpolation<number>;
}

function UnderHeader({
  headerHeight,
}: PhoneConnectionBannerProps): React.JSX.Element {
  return (
    <Animated.View
      className="pointer-events-box-none"
      style={
        headerHeight ? { transform: [{ translateY: headerHeight }] } : undefined
      }
    >
      <LiveConnectionBanner />
    </Animated.View>
  );
}

// The same banner on a narrow page, floating just under its header so the page under it never moves.
export function PhoneConnectionBanner(
  props: PhoneConnectionBannerProps,
): React.JSX.Element {
  return (
    <View className="pointer-events-box-none absolute inset-x-0 top-2 items-center">
      <UnderHeader {...props} />
    </View>
  );
}
