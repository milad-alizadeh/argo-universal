import type { NativeStackNavigationOptions } from 'expo-router';
import type { SelectionMode } from '#kit/selection-mode';

// The stack's header already draws the Screen's heading, which draws the selecting List's header; it only hides Back.
export function selectionOptions(
  mode?: SelectionMode | null,
): NativeStackNavigationOptions {
  return mode?.header
    ? { headerBackVisible: false, headerLeft: () => null }
    : {};
}
