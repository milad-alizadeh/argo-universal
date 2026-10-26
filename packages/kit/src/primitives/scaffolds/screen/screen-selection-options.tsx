import type { NativeStackNavigationOptions } from 'expo-router';
import type { SelectionMode } from '#kit/selection-mode';

const selecting = { headerBackVisible: false, headerLeft: (): null => null };

// A stack merges each Screen's options into the last ones, so leaving selection names the keys it set to give Back and ☰ back.
const idle = { headerBackVisible: undefined, headerLeft: undefined };

// The stack's header already draws the Screen's heading, which draws the selecting List's header; it only hides Back and the leading item.
export function selectionOptions(
  mode: SelectionMode | null | undefined,
  leading?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return mode?.header ? selecting : { ...idle, ...leading };
}
