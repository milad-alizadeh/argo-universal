import { hasLiquidGlass, ScreenHeaderProvider } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { headerTitleOptions } from './header-title';
import { WebScreenHeader } from './web-screen-header';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
  ...headerTitleOptions,
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// A phone section's stack; phone screens declare their native header, and the narrow web's screens set theirs through ScreenHeader.
export function PhoneStack({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <ScreenHeaderProvider header={WebScreenHeader}>
      <Stack screenOptions={screenOptions}>{children}</Stack>
    </ScreenHeaderProvider>
  );
}
