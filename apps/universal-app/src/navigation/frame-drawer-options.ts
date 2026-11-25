import {
  useFrameSidebarWidth,
  usePhoneDrawerWidth,
  type SizeClass,
} from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { composeDrawerOptions } from './compose-drawer-options';
import { nativeFrame } from './native-frame';

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
function framedOptions(width: number): DrawerNavigationOptions {
  return {
    drawerStyle: {
      width,
      backgroundColor: 'transparent',
      borderRightWidth: 0,
    },
    sceneStyle: { backgroundColor: 'transparent' },
  };
}

export function useDrawerOptions(
  sizeClass: SizeClass,
): DrawerNavigationOptions {
  const narrow = useNarrowOptions();
  const width = useFrameSidebarWidth();

  if (nativeFrame)
    return {
      ...composeDrawerOptions('wide', { narrow, framed: framedOptions(0) }),
    };

  return composeDrawerOptions(sizeClass, {
    narrow,
    framed: framedOptions(width),
  });
}
