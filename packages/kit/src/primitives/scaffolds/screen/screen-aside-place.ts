// The aside's own width, beside the content.
export const asideWidth = 280;

/*
 * Where a Screen's aside draws: its own column at the right, a row of Pills under the title, or, where even that is
 * short of room, Pills that show their icon alone.
 */
export type AsidePlace = 'aside' | 'pills' | 'icons';

export interface AsideRoom {
  // The Screen's own width, 0 until measured.
  width: number;
  wide: boolean;
  // The reading column's cap and the inset each side of it.
  column: number;
  inset: number;
  // The medium Size class threshold: below it Pills show icons, and the column beside an aside never reads narrower.
  medium: number;
}

// The reading column's place from the Screen's left and right edges, its insets included.
export interface ColumnEdges {
  left: number;
  right: number;
}

export interface AsideLayout {
  place: AsidePlace;
  // Where the column sits while the aside has its own column; absent, it keeps its centred place.
  column?: ColumnEdges;
}

/*
 * The one rule for where the aside draws and where the column sits beside it. It reads the Screen's width alone, never
 * whether the page has an aside, so every page at a width draws its title and body in one place, and opening an Issue
 * from its list moves neither. From the width that leaves the column beside the aside at least the medium width (or
 * the column's own cap, if that is less), the aside takes a lane at the right: an inset, its width and an inset. The
 * column then gives up its width first, keeping its left inset, and once it is back at its cap it moves right until
 * it is centred, where both gutters hold the aside. Below that width the aside is Pills under the title.
 */
export function asideLayout(room: AsideRoom): AsideLayout {
  if (belowMedium(room)) return { place: 'icons' };

  const column = besideAside(room);

  return column ? { place: 'aside', column } : { place: 'pills' };
}

// An unmeasured Screen, width 0, draws Pills until it knows its width.
const belowMedium = ({ width, medium }: AsideRoom): boolean =>
  width > 0 && width < medium;

// The aside's lane at the right: its width and an inset each side of it.
const laneWidth = (inset: number): number => asideWidth + inset * 2;

function besideAside(room: AsideRoom): ColumnEdges | undefined {
  if (!room.wide) return undefined;

  const { width, column, inset } = room;
  const lane = laneWidth(inset);
  const reading = Math.min(column, width - lane - inset);

  if (reading < Math.min(column, room.medium)) return undefined;

  return edges(width, reading, lane);
}

// Centred where it can be, else as far right as the aside's lane lets it.
function edges(width: number, reading: number, lane: number): ColumnEdges {
  const centred = (width - reading) / 2;
  const left = Math.min(centred, width - lane - reading);

  return { left, right: width - left - reading };
}
