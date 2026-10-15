import {
  hasLiquidGlass,
  nativeHeaderOptions,
  PhoneConnectionBanner,
  screenHeaderOptions,
  type Section,
  type SectionRootHeaders,
  sectionOf,
  useSectionRootHeaders,
  useWide,
} from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import {
  type DrawerNavigationOptions,
  DrawerToggleButton,
} from 'expo-router/drawer';
import {
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

// Android's section roots show the drawer's own header, with its stock toggle, as a leading item in a native-stack header drops the native title; iOS and the web show the stack's, so iOS keeps Liquid Glass and the native search.
const drawerDrawsRootHeader = Platform.OS === 'android';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

const atSectionRoot = (route: RouteProp<ParamListBase>): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index';

// A pushed page, and every page of a wide window, keeps its stack's header; its edge swipe goes back.
const stackOwnsHeader = { headerShown: false, swipeEnabled: false };

function drawerRootOptions(
  header: SectionRootHeaders[Section],
): DrawerNavigationOptions {
  const shown = drawerDrawsRootHeader
    ? { headerShown: true, ...nativeHeaderOptions(header) }
    : { headerShown: false };

  return { ...shown, swipeEnabled: edgeSwipeOpens };
}

// Each section's options on the shell's drawer: its header shows only on a narrow section root, so no page shows two.
export const drawerScreenOptions =
  (wide: boolean, headers: SectionRootHeaders) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions =>
    wide || !atSectionRoot(route)
      ? stackOwnsHeader
      : drawerRootOptions(headers[sectionOf(route.name)]);

// The drawer's own stock toggle leads a narrow section root's header.
const drawerToggle: NativeStackNavigationOptions['headerLeft'] = ({
  tintColor,
}) => <DrawerToggleButton tintColor={tintColor} />;

// A narrow page's Connection banner floats under its header; a wide window's sits over the panes.
function NarrowBanner({
  overHeader,
}: {
  overHeader: boolean;
}): React.JSX.Element | null {
  return useWide() ? null : <PhoneConnectionBanner overHeader={overHeader} />;
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
  const header = useSectionRootHeaders()[section];

  if (wide) return { screenOptions: wideOptions, rootOptions: {} };

  return {
    screenOptions: narrowOptions,
    rootOptions: drawerDrawsRootHeader
      ? { headerShown: false }
      : { headerLeft: drawerToggle, ...screenHeaderOptions(header) },
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
