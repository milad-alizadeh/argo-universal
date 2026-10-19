import {
  hasLiquidGlass,
  screenHeaderOptions,
  type CoreSection,
  type SectionList,
  useSectionList,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { DrawerMenuButton } from './drawer-menu-button';
import { headerTitleOptions } from './header-title';
import { pageLayout } from './page-layout';
import { drawerDrawsRootHeader } from './section-drawer-options';

type ScreenHeaderProps = SectionList['rootHeader'];

type StackProps = ComponentProps<typeof Stack>;

// With Liquid Glass, content scrolls under a clear header; before it, the opaque header takes the theme's content colour.
const headerOverPage = { headerTransparent: hasLiquidGlass };

// Native header options every narrow stack shares: one line, no hairline border.
const narrowOptions = {
  headerShadowVisible: false,
  ...headerOverPage,
  headerBackButtonDisplayMode: 'minimal',
  // A page below the shown one keeps its state but skips renders.
  freezeOnBlur: true,
  ...headerTitleOptions,
} satisfies StackProps['screenOptions'];

// A wide window shows one page beside the list: it draws its own header, and a new page replaces the shown one without a transition.
const framedOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

/*
 * A narrow section root's header on the stack: the web's JS header leads with ☰ and its attention dot; iOS takes the
 * title here, and the root page declares ☰, its items and its search as stock items (`SectionRoot`).
 */
const stackRootOptions = (
  header: SectionList['rootHeader'],
): NativeStackNavigationOptions =>
  Platform.OS === 'web'
    ? { headerLeft: () => <DrawerMenuButton />, ...screenHeaderOptions(header) }
    : screenHeaderOptions(header);

interface SectionOptions {
  screenOptions: StackProps['screenOptions'];
  rootOptions: NativeStackNavigationOptions;
}

// The stack's options at this width, and its root's: the phone shell's root shows the section's header; a wide window's page draws its own.
function useSectionOptions(
  header: ScreenHeaderProps,
  root: boolean,
  fullScreenGestureEnabled?: boolean,
): SectionOptions {
  const wide = useWide();

  return {
    screenOptions: {
      ...(wide ? framedOptions : narrowOptions),
      fullScreenGestureEnabled,
    },
    rootOptions: wide ? {} : narrowRootOptions(header, root),
  };
}

function narrowRootOptions(
  header: ScreenHeaderProps,
  root: boolean,
): NativeStackNavigationOptions {
  if (!root) return screenHeaderOptions(header);

  return drawerDrawsRootHeader
    ? { headerShown: false }
    : stackRootOptions(header);
}

interface SectionStackProps extends PropsWithChildren {
  section: CoreSection;
}

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list under the section's header; a wide one shows the list beside it. Each page names itself through `ScreenHeader`.
export function SectionStack({
  section,
  children,
}: SectionStackProps): React.JSX.Element {
  return (
    <PageStack header={useSectionList(section).rootHeader}>
      {children}
    </PageStack>
  );
}

interface PageStackProps extends PropsWithChildren {
  header: ScreenHeaderProps;
  root?: boolean;
  rootName?: string;
  fullScreenGestureEnabled?: boolean;
  singular?: ComponentProps<typeof Stack.Screen>['dangerouslySingular'];
}

// Core lists and Plugin pages share stock stack headers, page placement and the Connection banner.
export function PageStack(props: PageStackProps): React.JSX.Element {
  const { screenOptions, rootOptions } = useSectionOptions(
    props.header,
    props.root ?? true,
    props.fullScreenGestureEnabled,
  );

  return (
    <Stack screenOptions={screenOptions} screenLayout={pageLayout}>
      <Stack.Screen {...rootScreen(props, rootOptions)} />
      {props.children}
    </Stack>
  );
}

function rootScreen(
  props: PageStackProps,
  options: NativeStackNavigationOptions,
): ComponentProps<typeof Stack.Screen> {
  return {
    name: props.rootName ?? 'index',
    options,
    dangerouslySingular: props.singular,
  };
}
