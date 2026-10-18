import {
  frameSidebarWidth,
  usePhoneDrawerWidth,
  type FrameParts,
  type SizeClass,
} from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';

// ADR-0026, amended 2026-10-18: the drawer sits in front of the pages on a compact or medium window, and beside them on a wide one.
const drawerTypes = {
  compact: 'front',
  medium: 'front',
  wide: 'permanent',
} as const satisfies Record<SizeClass, DrawerNavigationOptions['drawerType']>;

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
  const narrow = useNarrowOptions();

  return {
    ...(sizeClass === 'wide' ? framedOptions(frame) : narrow),
    drawerType: drawerTypes[sizeClass],
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}
