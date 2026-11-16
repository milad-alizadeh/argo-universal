import { useMaterialPalette } from '@repo/kit/primitives/native/material-palette';
import type { ViewStyle } from 'react-native';
import type { RailTiles } from './rail-tiles';

// A tablet's 80 rail: 48 tiles a hairline apart; the style below fills the selected one.
export const railTiles: RailTiles = {
  size: 'size-12',
  corners: 'rounded-xl',
  selected: 'bg-selected',
  column: 'gap-px',
  collapsedColumn: 'gap-px',
};

/*
 * @expo/ui has no NavigationRail, so Argo draws the rail (#927); its selected tile takes the Material palette's
 * rail indicator, flat as Material's indicator is, with no inset shadow (Paper "Android / Session open").
 */
export function useRailTileStyle(selected: boolean): ViewStyle | undefined {
  const { indicator } = useMaterialPalette().roles;

  return selected ? { backgroundColor: indicator, boxShadow: [] } : undefined;
}
