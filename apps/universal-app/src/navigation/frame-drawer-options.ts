import {
  frameSidebarWidth,
  usePhoneDrawerWidth,
  type FrameParts,
  type SizeClass,
} from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';

// ADR-0026: the drawer sits in front of the pages until the medium layout is built, and beside them on a wide window.
const drawerTypes = {
  compact: 'front',
  medium: 'front',
  wide: 'permanent',
} as const satisfies Record<SizeClass, DrawerNavigationOptions['drawerType']>;

// The Frame lays out a medium window as a compact one until the medium layout is built.
export const frameSizeClass = (wide: boolean): SizeClass =>
  wide ? 'wide' : 'compact';

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
function wideOptions(frame: FrameParts): DrawerNavigationOptions {
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
    ...(sizeClass === 'wide' ? wideOptions(frame) : narrow),
    drawerType: drawerTypes[sizeClass],
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}
