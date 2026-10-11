import { hasLiquidGlass } from '@repo/client';
import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { useHeaderTitleOptions } from './header-title';

// Native header options every sheet page shares: one centred line, no hairline.
const sheetHeaderOptions = {
  headerShadowVisible: false,
  // iOS 26 fades the content scrolling under a transparent header.
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
  headerTitleAlign: 'center',
  // Lets the system sheet's own background show, which is Liquid Glass on iOS 26.
  contentStyle: { backgroundColor: 'transparent' },
  // The sheet starts below the status bar, so Android's header needs no room for it.
  unstable_nativeProps: {
    headerConfig: { disableTopInsetApplication: true },
  },
} satisfies ComponentProps<typeof Stack>['screenOptions'];

export function useSheetHeaderOptions(): ComponentProps<
  typeof Stack
>['screenOptions'] {
  const titleOptions = useHeaderTitleOptions();
  return { ...sheetHeaderOptions, ...titleOptions };
}
