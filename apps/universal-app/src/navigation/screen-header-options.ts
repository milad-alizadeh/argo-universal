import type { ScreenHeaderProps } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';

// The header row every platform draws: shown, titled, with its leading item.
export function screenHeaderOptions({
  title,
  left,
}: Pick<ScreenHeaderProps, 'title' | 'left'>): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    headerLeft: left ? () => left : undefined,
  };
}
