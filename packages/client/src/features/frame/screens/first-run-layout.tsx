import type * as React from 'react';
import { Platform } from 'react-native';
import { LiveConnectionBanner } from '#features/connection';
import { GetStartedScreen, useFirstRun } from '#features/setup';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { FirstRunShell } from '../components/first-run-shell/first-run-shell';

// A Server is set up from a desktop window or browser at any width; a phone pairs only after setup, so it never shows Get started.
export function useGetStartedShown(
  destination: NavigationDestination,
): boolean {
  const firstRun = useFirstRun();
  return firstRun && destination.to === 'sessions' && Platform.OS === 'web';
}

// Get started on its own in place of Sessions, until the first Project arrives; Settings keep the full shell.
export function FirstRunLayout(): React.JSX.Element {
  return (
    <FirstRunShell banner={<LiveConnectionBanner />}>
      <GetStartedScreen />
    </FirstRunShell>
  );
}
