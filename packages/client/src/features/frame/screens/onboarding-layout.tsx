import type * as React from 'react';
import { Platform } from 'react-native';
import { LiveConnectionBanner } from '#features/connection';
import { OnboardingScreen, useFirstRun } from '#features/setup';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { OnboardingShell } from '../components/onboarding-shell/onboarding-shell';

// A Server is set up from a desktop window or browser at any width; a phone pairs only after setup, so it never shows Onboarding.
export function useOnboardingShown(
  destination: NavigationDestination,
): boolean {
  const firstRun = useFirstRun();
  return firstRun && destination.to === 'sessions' && Platform.OS === 'web';
}

// Onboarding on its own in place of Sessions, until the first Project arrives; Settings keep the full shell.
export function OnboardingLayout(): React.JSX.Element {
  return (
    <OnboardingShell banner={<LiveConnectionBanner />}>
      <OnboardingScreen />
    </OnboardingShell>
  );
}
