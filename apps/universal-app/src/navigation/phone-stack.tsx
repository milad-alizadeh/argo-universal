import { hasLiquidGlass, ScreenHeaderProvider } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { useHeaderTitleOptions } from './header-title';
import { NativeScreenHeader } from './native-screen-header';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// A phone section's native stack; its screens set their header through ScreenHeader.
export function PhoneStack({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const titleOptions = useHeaderTitleOptions();
  return (
    <ScreenHeaderProvider header={NativeScreenHeader}>
      <Stack screenOptions={{ ...screenOptions, ...titleOptions }}>
        {children}
      </Stack>
    </ScreenHeaderProvider>
  );
}
