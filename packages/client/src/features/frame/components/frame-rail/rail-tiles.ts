import type { IconButtonProps } from '#primitives/actions/icon-button';

// The rail's tiles on one platform: their IconButton size, corner and selected classes, and the column's spacing beside the list and with it hidden.
export interface RailTiles {
  size: NonNullable<IconButtonProps['size']>;
  corners: string;
  selected: string;
  column: string;
  collapsedColumn: string;
}
