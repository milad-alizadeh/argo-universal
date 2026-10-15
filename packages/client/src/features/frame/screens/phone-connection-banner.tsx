import type * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiveConnectionBanner } from '#features/connection';
import { headerBarHeight } from '../components/phone-drawer-content/header-bar-height';

// The gap between the header bar and the banner.
const bannerGap = 8;

// The live Connection banner, floating just under a phone section's header so the page under it never moves.
export function PhoneConnectionBanner(): React.JSX.Element {
  const { top } = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ top: top + headerBarHeight + bannerGap }}
    >
      <LiveConnectionBanner />
    </View>
  );
}
