import type { ViewStyle } from 'react-native';
import { useMaterialPalette } from '#primitives/native/material-palette';

/*
 * @expo/ui has no NavigationRail, so Argo draws the rail (#927); its selected tile takes the Material palette's
 * rail indicator, flat as Material's indicator is, with no inset shadow (Paper "Android / Session open").
 */
export function useRailTileStyle(selected: boolean): ViewStyle | undefined {
  const { indicator } = useMaterialPalette().roles;

  return selected ? { backgroundColor: indicator, boxShadow: [] } : undefined;
}
