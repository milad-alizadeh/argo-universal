import type { SizeClass } from '@repo/client';
import type { DrawerNavigationOptions } from 'expo-router/drawer';

// ADR-0026, amended 2026-10-18: the drawer sits in front of the pages on a compact or medium window, and beside them on a wide one.
const drawerTypes = {
  compact: 'front',
  medium: 'front',
  wide: 'permanent',
} as const satisfies Record<SizeClass, DrawerNavigationOptions['drawerType']>;

// The scrim's own name, else the library's English default; it pairs with the "Open navigation" button.
const scrimLabel = 'Close navigation';

export function composeDrawerOptions(
  sizeClass: SizeClass,
  parts: {
    narrow: DrawerNavigationOptions;
    framed: DrawerNavigationOptions;
  },
): DrawerNavigationOptions {
  return {
    ...(sizeClass === 'wide' ? parts.framed : parts.narrow),
    drawerType: drawerTypes[sizeClass],
    overlayAccessibilityLabel: scrimLabel,
    // A hidden section keeps its stack but skips renders.
    freezeOnBlur: true,
  };
}
