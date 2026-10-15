import { OnboardingLayout, useOnboardingShown } from '@repo/client';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import { FrameNavigator } from '@/navigation/frame-navigator';

// The App's Frame of sections; a web window sets up its Server first.
export default function FrameLayout(): React.JSX.Element {
  if (useOnboardingShown(usePathname())) return <OnboardingLayout />;

  return <FrameNavigator />;
}
