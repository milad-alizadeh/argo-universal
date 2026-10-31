import type { DrawerNavigationOptions } from 'expo-router/drawer';
import {
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type DescriptorRouteProp,
} from 'expo-router/react-navigation';
import { Platform } from 'react-native';

// Android's back gesture owns the screen edge, so there only ☰ opens the drawer.
const edgeSwipeOpens = Platform.OS === 'ios';

const atSectionRoot = (route: DescriptorRouteProp<ParamListBase>): boolean =>
  (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index';

// A pushed page, and every page of a wide window, keeps its stack's header; its edge swipe goes back.
export const stackOwnsHeader = { headerShown: false, swipeEnabled: false };

/*
 * The drawer draws no header of its own: every page's header is its stack screen's, so it travels with the page it
 * names. Android's root header used to be the drawer's, and pushing a page took it down a frame before the push had
 * covered the list, which left the list to jump up into its place (owner, 2026-10-21).
 */
export const drawerRootOptions: DrawerNavigationOptions = {
  headerShown: false,
  swipeEnabled: edgeSwipeOpens,
};

/*
 * A section's stack is mounted with the Frame, not when the section is first shown. Expo Router builds the stack of a
 * section that is not mounted when a link arrives with only the linked page in it (`withAnchor` is off for a link from
 * outside), so a page opened by a deep link had no root below it and no Back. A mounted stack holds its root, and the
 * link pushes the page over it.
 */
const mountedWithFrame = { lazy: false };

// Each section's options on the Frame's drawer: only its root keeps the edge swipe that opens the drawer.
export const drawerScreenOptions =
  (framed: boolean) =>
  ({
    route,
  }: {
    route: DescriptorRouteProp<ParamListBase>;
  }): DrawerNavigationOptions => ({
    ...mountedWithFrame,
    ...(framed || !atSectionRoot(route) ? stackOwnsHeader : drawerRootOptions),
  });
