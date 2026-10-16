import type * as React from 'react';
import { Platform } from 'react-native';
import { LiveConnectionBanner, OnboardingFrame } from '#features/frame';
import { useFirstRun } from '#features/setup';
import { sectionOf } from '../../lib/product/navigation/sections';
import { OnboardingScreen } from './onboarding-screen';

// A Server is set up from a desktop window or browser at any width; a phone pairs only after setup, so it never shows Onboarding.
export function useOnboardingShown(path: string): boolean {
  const firstRun = useFirstRun();

  return firstRun && sectionOf(path) === 'sessions' && Platform.OS === 'web';
}

// Onboarding on its own in place of Sessions, until the first Project arrives; Settings keep the full Frame.
export function OnboardingLayout(): React.JSX.Element {
  return (
    <OnboardingFrame banner={<LiveConnectionBanner />}>
      <OnboardingScreen />
    </OnboardingFrame>
  );
}
