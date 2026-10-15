import {
  hasLiquidGlass,
  ScreenHeaderProvider,
  type ScreenHeaderProps,
} from '@repo/client';
import { Stack, useRoute } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { DrawerSectionHeader } from './drawer-section-header';
import { headerTitleOptions } from './header-title';
import { WebScreenHeader } from './web-screen-header';

// Native header options every phone stack shares: one line, no hairline border.
const screenOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
  ...headerTitleOptions,
} satisfies ComponentProps<typeof Stack>['screenOptions'];

// On a phone the section's root shows its drawer screen's header instead; the narrow web keeps the stack's.
const nativeDrawerHeader = Platform.OS !== 'web';

const sectionRoot = 'index';

const rootOptions = { headerShown: !nativeDrawerHeader };

// A root sets its drawer screen's header; a pushed page sets its own stack header.
function PhoneScreenHeader(header: ScreenHeaderProps): React.JSX.Element {
  const Header =
    useRoute().name === sectionRoot ? DrawerSectionHeader : WebScreenHeader;

  return <Header {...header} />;
}

const SectionHeader = nativeDrawerHeader ? PhoneScreenHeader : WebScreenHeader;

// A phone section's stack; on a phone a root's ScreenHeader sets the drawer's header, and every other page's ScreenHeader sets the stack's.
export function PhoneStack({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <ScreenHeaderProvider header={SectionHeader}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name={sectionRoot} options={rootOptions} />
        {children}
      </Stack>
    </ScreenHeaderProvider>
  );
}
