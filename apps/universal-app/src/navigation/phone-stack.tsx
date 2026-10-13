import { hasLiquidGlass, ScreenHeaderProvider } from '@repo/client';
import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useHeaderTitleOptions } from './header-title';
import { NativeScreenHeader } from './native-screen-header';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// iOS 26's transparent header lies over the top of the screen; every other header takes its own space.
function useGlassHeaderCover(): number {
  const height = useHeaderHeight();

  return hasLiquidGlass ? height : 0;
}

// A phone section's native stack; its screens set their header through ScreenHeader.
export function PhoneStack({ children }: PropsWithChildren): React.JSX.Element {
  const titleOptions = useHeaderTitleOptions();

  return (
    <ScreenHeaderProvider
      header={NativeScreenHeader}
      useHeaderCover={useGlassHeaderCover}
    >
      <Stack screenOptions={{ ...screenOptions, ...titleOptions }}>
        {children}
      </Stack>
    </ScreenHeaderProvider>
  );
}
