import {
  drawerHeaderOptions,
  type HeaderItem,
  HeaderItemButton,
  hasLiquidGlass,
  PhoneConnectionBanner,
  type ScreenHeaderProps,
  screenHeaderOptions,
  screenHeaderToolbars,
  type Section,
  type SectionList,
  type SectionLists,
  sectionOf,
  useSectionList,
  useSectionMenuItem,
  useWide,
} from '@repo/client';
import {
  type NativeStackNavigationOptions,
  Stack,
  useNavigation,
} from 'expo-router';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { useAnimatedHeaderHeight } from 'expo-router/native-stack';
import {
  DrawerActions,
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type RouteProp,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { headerTitleOptions } from './header-title';

type StackProps = ComponentProps<typeof Stack>;

type ScreenLayout = NonNullable<StackProps['screenLayout']>;

// Native header options every narrow stack shares: one line, no hairline border.
const narrowOptions = {
  headerShadowVisible: false,
  headerTransparent: hasLiquidGlass,
  headerBackButtonDisplayMode: 'minimal',
  // A page below the shown one keeps its state but skips renders.
  freezeOnBlur: true,
  ...headerTitleOptions,
} satisfies StackProps['screenOptions'];

// A wide window shows one page beside the list: it draws its own header, and a new page replaces the shown one without a transition.
const wideOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

// Android's section roots show the drawer's own header, as a leading item in a native-stack header drops the native title; iOS and the web show the stack's, which the root page fills, so iOS keeps Liquid Glass, stock bar button items and the native search.
const drawerDrawsRootHeader = Platform.OS === 'android';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

const atSectionRoot = (route: RouteProp<ParamListBase>): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index';

// A pushed page, and every page of a wide window, keeps its stack's header; its edge swipe goes back.
const stackOwnsHeader = { headerShown: false, swipeEnabled: false };

// ☰, which opens the Frame's drawer from a header inside any of its sections; the action reaches the drawer from a section's stack too.
function useDrawerMenuItem(): HeaderItem {
  const navigation = useNavigation();

  return useSectionMenuItem(() =>
    navigation.dispatch(DrawerActions.openDrawer()),
  );
}

function DrawerMenuButton(): React.JSX.Element {
  return <HeaderItemButton item={useDrawerMenuItem()} />;
}

// ☰ leads Android's drawer header on a narrow section root.
const drawerMenu = (): React.JSX.Element => <DrawerMenuButton />;

function drawerRootOptions(
  header: SectionList['rootHeader'],
): DrawerNavigationOptions {
  const shown = drawerDrawsRootHeader
    ? {
        headerShown: true,
        headerLeft: drawerMenu,
        ...drawerHeaderOptions(header),
      }
    : { headerShown: false };

  return { ...shown, swipeEnabled: edgeSwipeOpens };
}

// Each section's options on the Frame's drawer: its header shows only on a narrow section root, so no page shows two.
export const drawerScreenOptions =
  (wide: boolean, lists: SectionLists) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions =>
    wide || !atSectionRoot(route)
      ? stackOwnsHeader
      : drawerRootOptions(lists[sectionOf(route.name)].rootHeader);

interface BannerProps {
  overHeader: boolean;
}

// Under a header that floats over the page, the banner moves down by the header's height, as the stack reports it.
function UnderHeaderBanner({ overHeader }: BannerProps): React.JSX.Element {
  const headerHeight = useAnimatedHeaderHeight();

  return (
    <PhoneConnectionBanner
      headerHeight={overHeader ? headerHeight : undefined}
    />
  );
}

// A narrow page's Connection banner floats under its header; a wide window's sits over the panes.
function NarrowBanner(props: BannerProps): React.JSX.Element | null {
  return useWide() ? null : <UnderHeaderBanner {...props} />;
}

// The page keeps its place in the tree at both widths.
const pageLayout: ScreenLayout = ({ children, options }) => (
  <View className="flex-1">
    {children}
    <NarrowBanner overHeader={options.headerTransparent === true} />
  </View>
);

interface SectionOptions {
  screenOptions: StackProps['screenOptions'];
  rootOptions: NativeStackNavigationOptions;
  // The root's stock header items, which its `Stack.Screen` reads by type.
  rootItems: ReactNode;
}

const wideSection: SectionOptions = {
  screenOptions: wideOptions,
  rootOptions: {},
  rootItems: null,
};

const androidRoot = { rootOptions: { headerShown: false }, rootItems: null };

// iOS and the web: ☰, the section's title and items, and its search, on the stack's own header.
const stackRoot = (
  header: ScreenHeaderProps,
): Omit<SectionOptions, 'screenOptions'> => ({
  rootOptions: screenHeaderOptions(header),
  rootItems: screenHeaderToolbars(header),
});

// The stack's options at this width, and its root's: a narrow root shows the section's header; a wide page draws its own.
function useSectionOptions(section: Section): SectionOptions {
  const wide = useWide();
  const header = useSectionList(section).rootHeader;
  const left = useDrawerMenuItem();

  if (wide) return wideSection;

  return {
    screenOptions: narrowOptions,
    ...(drawerDrawsRootHeader ? androidRoot : stackRoot({ ...header, left })),
  };
}

interface SectionStackProps extends PropsWithChildren {
  section: Section;
}

// A section's pages, always this one stack so a width change keeps them: a narrow window pushes each page over the list under the section's header; a wide one shows the list beside it. Each page names itself through `ScreenHeader`.
export function SectionStack({
  section,
  children,
}: SectionStackProps): React.JSX.Element {
  const { screenOptions, rootOptions, rootItems } = useSectionOptions(section);

  return (
    <Stack screenOptions={screenOptions} screenLayout={pageLayout}>
      <Stack.Screen name="index" options={rootOptions}>
        {rootItems}
      </Stack.Screen>
      {children}
    </Stack>
  );
}
