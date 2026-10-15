import { useQuery } from '@tanstack/react-query';
import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import type * as React from 'react';
import { Animated, View } from 'react-native';
import {
  ConnectionBanner,
  useConnection,
  useConnectionState,
  useTRPC,
} from '#features/connection';

// The App's Connection banner: the live state, the Server's name from its last system.info, and Try again. A wide window floats it over the panes.
export function LiveConnectionBanner(): React.JSX.Element | null {
  const connection = useConnection();
  const state = useConnectionState();
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());

  return (
    <ConnectionBanner
      state={state}
      serverName={info.data?.name}
      onRetry={() => connection.send({ type: 'connection.retry' })}
    />
  );
}

export interface PhoneConnectionBannerProps {
  // The stack's header floats over the page (`headerTransparent`), so the banner moves down by its height; otherwise the page already starts under it.
  overHeader: boolean;
}

function UnderHeader({
  overHeader,
}: PhoneConnectionBannerProps): React.JSX.Element {
  const headerHeight = useAnimatedHeaderHeight();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={
        overHeader ? { transform: [{ translateY: headerHeight }] } : undefined
      }
    >
      <LiveConnectionBanner />
    </Animated.View>
  );
}

// The same banner on a narrow page, floating just under its header so the page under it never moves. The header's height is the stack's own, as it reports it.
export function PhoneConnectionBanner(
  props: PhoneConnectionBannerProps,
): React.JSX.Element {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-2 items-center"
    >
      <UnderHeader {...props} />
    </View>
  );
}
