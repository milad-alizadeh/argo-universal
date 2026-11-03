// The aside's own width, beside the content.
export const asideWidth = 280;

/*
 * Where a Screen's aside draws: its own column in the right gutter, a row of Pills under the title, or, where even
 * that is short of room, Pills that show their icon alone.
 */
export type AsidePlace = 'aside' | 'pills' | 'icons';

export interface AsideRoom {
  // The Screen's own width, 0 until measured.
  width: number;
  wide: boolean;
  // The reading column's cap and the inset each side of it.
  column: number;
  inset: number;
  // The medium Size class threshold, below which Pills show icons.
  medium: number;
}

/*
 * The aside never moves the content: the reading column keeps its width and stays centred, and the aside takes the
 * right gutter only when that gutter holds it and an inset after it. So a page with an aside starts its title where a
 * page without one does, and the Pills that stand in for it sit inside the column.
 */
export function asidePlace(room: AsideRoom): AsidePlace {
  if (room.width === 0) return 'pills';

  if (room.width < room.medium) return 'icons';

  return room.wide && gutterHolds(room) ? 'aside' : 'pills';
}

function gutterHolds({ width, column, inset }: AsideRoom): boolean {
  const gutter = (width - (column + inset * 2)) / 2;

  return gutter >= asideWidth + inset;
}
