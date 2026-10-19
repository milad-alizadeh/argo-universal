import type { ViewStyle } from 'react-native';
import type { RailTiles } from './rail-tiles';

// A tablet's 80 rail: 48 tiles a hairline apart, the selected one pressed in.
export const railTiles: RailTiles = {
  size: 'xl',
  corners: 'rounded-xl',
  selected: 'bg-selected shadow-inset',
  column: 'gap-px',
};

// The selected tile's fill: the `bg-selected` class draws it here; Android takes it from its Material palette.
export function useRailTileStyle(_selected: boolean): ViewStyle | undefined {
  return undefined;
}
