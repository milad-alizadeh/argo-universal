import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import type * as React from 'react';
import { Animated, View } from 'react-native';
import { LiveConnectionBanner } from './live-connection-banner';

export interface PhoneConnectionBannerProps {
  // The stack's header floats over the page (`headerTransparent`), so the banner moves down by its height; otherwise the page already starts under it.
  overHeader: boolean;
}

// The live Connection banner, floating just under a narrow page's header so the page under it never moves. The header's height is the stack's own, as it reports it.
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
