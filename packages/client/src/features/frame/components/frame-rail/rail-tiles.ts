// The rail's tiles on one platform: their size, corner and selected classes, and the column's spacing beside the list and with it hidden.
export interface RailTiles {
  size: string;
  corners: string;
  selected: string;
  // Where the selected section's edge marker sits, at the rail's edge; empty where the platform marks it itself.
  marker: string;
  column: string;
  collapsedColumn: string;
}
