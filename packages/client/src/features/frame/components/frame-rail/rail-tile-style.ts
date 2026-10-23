import type { ViewStyle } from 'react-native';
import type { RailTiles } from './rail-tiles';

// A tablet's 80 rail: 48 tiles a hairline apart, the selected one a flat tint.
export const railTiles: RailTiles = {
  size: 'size-12',
  corners: 'rounded-xl',
  selected: 'bg-selected',
  column: 'gap-px',
  collapsedColumn: 'gap-px',
};

// The selected tile's fill: the `bg-selected` class draws it here; Android takes it from its Material palette.
export function useRailTileStyle(_selected: boolean): ViewStyle | undefined {
  return undefined;
}
