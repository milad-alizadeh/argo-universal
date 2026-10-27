import type { NativeStackNavigationOptions } from 'expo-router';
import type { SelectionMode } from '#kit/selection-mode';

// A stack merges each Screen's options into the last ones, so leaving selection names the keys it set to give Back back.
const idle = { headerBackVisible: undefined };

// A phone's stack draws the selecting List's count as its title; its items come from ScreenHeaderItems.
export function selectionOptions(
  mode?: SelectionMode | null,
): NativeStackNavigationOptions {
  const bar = mode?.bar;

  return bar ? { title: bar.title, headerBackVisible: false } : idle;
}
