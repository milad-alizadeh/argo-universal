import {
  hasLiquidGlass,
  nativeHeaderOptions,
  PhoneConnectionBanner,
  SectionMenuButton,
  screenHeaderOptions,
  type Section,
  type SectionList,
  type SectionLists,
  sectionOf,
  useSectionList,
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
import type { ComponentProps, PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import { headerTitleOptions } from './header-title';

type StackProps = ComponentProps<typeof Stack>;

type ScreenLayout = NonNullable<StackProps['screenLayout']>;

/*
 * Before Liquid Glass, an opaque iOS header takes the theme's card colour, a band over a grouped page. The stock bar
 * instead: clear at the scroll edge, so the page shows through, and the system material once content scrolls under.
 */
const stockBarBeforeGlass = {
  headerTransparent: true,
  headerBlurEffect: 'systemChromeMaterial',
  headerLargeStyle: { backgroundColor: 'transparent' },
} satisfies StackProps['screenOptions'];

// iOS draws its header over the page; the web's JS header sits above it.
const headerOverPage =
  Platform.OS === 'ios' && !hasLiquidGlass
    ? stockBarBeforeGlass
    : { headerTransparent: hasLiquidGlass };

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
const wideOptions = {
  headerShown: false,
  animation: 'none',
  freezeOnBlur: true,
} satisfies StackProps['screenOptions'];

// Android's section roots show the drawer's own header, with its stock toggle, as a leading item in a native-stack header drops the native title; iOS and the web show the stack's, so iOS keeps Liquid Glass, stock bar button items and the native search.
const drawerDrawsRootHeader = Platform.OS === 'android';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

const atSectionRoot = (route: RouteProp<ParamListBase>): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index';

// A pushed page, and every page of a wide window, keeps its stack's header; its edge swipe goes back.
const stackOwnsHeader = { headerShown: false, swipeEnabled: false };

function drawerRootOptions(
  header: SectionList['rootHeader'],
): DrawerNavigationOptions {
  const shown = drawerDrawsRootHeader
    ? { headerShown: true, ...nativeHeaderOptions(header) }
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

function WebMenuButton(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <SectionMenuButton
      onOpen={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}

/*
 * A narrow section root's header on the stack: the web's JS header leads with ☰ and its attention dot; iOS takes the
 * title here, and the root page declares ☰, its items and its search as stock items (`SectionRoot`).
 */
const stackRootOptions = (
  header: SectionList['rootHeader'],
): NativeStackNavigationOptions =>
  Platform.OS === 'web'
    ? { headerLeft: () => <WebMenuButton />, ...screenHeaderOptions(header) }
    : screenHeaderOptions(header);

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
}

// The stack's options at this width, and its root's: a narrow root shows the section's header; a wide page draws its own.
function useSectionOptions(section: Section): SectionOptions {
  const wide = useWide();
  const header = useSectionList(section).rootHeader;

  if (wide) return { screenOptions: wideOptions, rootOptions: {} };

  return {
    screenOptions: narrowOptions,
    rootOptions: drawerDrawsRootHeader
      ? { headerShown: false }
      : stackRootOptions(header),
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
  const { screenOptions, rootOptions } = useSectionOptions(section);

  return (
    <Stack screenOptions={screenOptions} screenLayout={pageLayout}>
      <Stack.Screen name="index" options={rootOptions} />
      {children}
    </Stack>
  );
}
