import {
  nativeHeaderOptions,
  type SectionList,
  type SectionLists,
} from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import {
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type RouteProp,
} from 'expo-router/react-navigation';
import { Platform } from 'react-native';

// Android's section roots show the drawer's own header, with its stock toggle, as a leading item in a native-stack header drops the native title; iOS and the web show the stack's, so iOS keeps Liquid Glass, stock bar button items and the native search.
export const drawerDrawsRootHeader = Platform.OS === 'android';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

const atSectionRoot = (route: RouteProp<ParamListBase>): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index';

// A pushed page, and every page of a wide window, keeps its stack's header; its edge swipe goes back.
export const stackOwnsHeader = { headerShown: false, swipeEnabled: false };

export function drawerRootOptions(
  header: SectionList['rootHeader'],
): DrawerNavigationOptions {
  const shown = drawerDrawsRootHeader
    ? { headerShown: true, ...nativeHeaderOptions(header) }
    : { headerShown: false };

  return { ...shown, swipeEnabled: edgeSwipeOpens };
}

// Each section's options on the Frame's drawer: its header shows only on the phone shell's section root, so no page shows two.
export const drawerScreenOptions =
  (framed: boolean, lists: SectionLists) =>
  ({ route }: { route: RouteProp<ParamListBase> }): DrawerNavigationOptions =>
    framed || !atSectionRoot(route)
      ? stackOwnsHeader
      : drawerRootOptions(lists[coreSectionOf(route.name)].rootHeader);

const coreSectionOf = (name: string): 'sessions' | 'settings' =>
  name === 'settings' ? 'settings' : 'sessions';
