import { OnboardingLayout, useOnboardingShown } from '@repo/client';
import type * as React from 'react';
import { ShellDrawer } from '@/navigation/shell-drawer';
import { useDestination } from '@/navigation/use-destination';

// One drawer of sections at every width; a web window sets up its Server first.
export default function ShellLayout(): React.JSX.Element {
  const onboarding = useOnboardingShown(useDestination());

  return onboarding ? <OnboardingLayout /> : <ShellDrawer />;
}
