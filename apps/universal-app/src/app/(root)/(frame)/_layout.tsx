import { OnboardingLayout, useOnboardingShown } from '@repo/client';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { FrameNavigator } from '@/navigation/frame-navigator';

// Retain the routed navigator during setup: unmounting it loses /sessions and repeatedly opens the Frame again.
export default function FrameLayout(): React.JSX.Element {
  const onboarding = useOnboardingShown(usePathname());

  return (
    <View className="flex-1">
      <View className={onboarding ? 'hidden' : 'flex-1'}>
        <FrameNavigator />
      </View>
      {onboarding && <OnboardingLayout />}
    </View>
  );
}
