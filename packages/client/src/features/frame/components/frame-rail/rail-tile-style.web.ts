import type { ViewStyle } from 'react-native';
import type { RailTiles } from './rail-tiles';

// Paper "Rail · narrow variants", Variant B: 40 tiles 4 apart with the control radius (the IconButton's own on the web, so no corner class), the selected one a flat tint; collapsed, the rail's glass starts at the top bar's foot and its tiles 8 below.
export const railTiles: RailTiles = {
  size: 'md',
  corners: '',
  selected: 'bg-selected',
  column: 'gap-1',
  collapsedColumn: 'gap-1',
};

// The selected tile's fill is the `bg-selected` class.
export function useRailTileStyle(_selected: boolean): ViewStyle | undefined {
  return undefined;
}
