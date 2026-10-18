import type { ViewStyle } from 'react-native';
import { useMaterialPalette } from '#primitives/native/material-palette';

/*
 * @expo/ui has no NavigationRail, so Argo draws the rail (#927); its selected tile takes the Material
 * palette's selection tint, as Android's drawer items do, in place of Material's secondary container.
 */
export function useRailTileStyle(selected: boolean): ViewStyle | undefined {
  const { selected: tint } = useMaterialPalette().roles;

  return selected ? { backgroundColor: tint } : undefined;
}
