import {
  frameSidebarWidth,
  usePhoneDrawerWidth,
  type FrameParts,
  type SizeClass,
} from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { composeDrawerOptions } from './compose-drawer-options';

// The web's themed page shows through the drawer; a resolved colour there misses the theme.
const drawerSurface = Platform.OS !== 'web';

function useNarrowOptions(): DrawerNavigationOptions {
  const surface = useResolveClassNames('bg-content');

  return {
    drawerStyle: [
      drawerSurface ? surface : undefined,
      { width: usePhoneDrawerWidth() },
    ],
    headerShadowVisible: false,
  };
}

// The rail and the list stay beside the pages, on the window's own surface; the glass sidebar draws its own edge.
function framedOptions(frame: FrameParts): DrawerNavigationOptions {
  return {
    drawerStyle: {
      width: frameSidebarWidth(frame),
      backgroundColor: 'transparent',
      borderRightWidth: 0,
    },
    sceneStyle: { backgroundColor: 'transparent' },
  };
}

export function useDrawerOptions(
  sizeClass: SizeClass,
  frame: FrameParts,
): DrawerNavigationOptions {
  return composeDrawerOptions(sizeClass, {
    narrow: useNarrowOptions(),
    framed: framedOptions(frame),
  });
}
