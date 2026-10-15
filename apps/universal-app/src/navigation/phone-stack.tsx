import { hasLiquidGlass, ScreenHeaderProvider } from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Platform, PlatformColor } from 'react-native';
import { useHeaderTitleOptions } from './header-title';
import { NativeScreenHeader } from './native-screen-header';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// What a page draws on: the App's content surface, or a grouped list's system background.
export type PageSurface = 'content' | 'grouped';

const solidIosHeader = Platform.OS === 'ios' && !hasLiquidGlass;

const groupedHeaderOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
};

/*
 * iOS 26's transparent header shows the page behind it. Earlier iOS draws a solid header in the theme's
 * content colour, so above a grouped list it takes the list's system grouped background instead.
 */
export function pageSurfaceOptions(
  surface: PageSurface,
): NativeStackNavigationOptions {
  return solidIosHeader && surface === 'grouped' ? groupedHeaderOptions : {};
}

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
