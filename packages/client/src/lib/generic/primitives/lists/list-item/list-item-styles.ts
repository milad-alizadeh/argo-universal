import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

/*
 * A grouped List's section shape. iOS draws one plate. Android draws segments: small inner corners and a gap instead
 * of separators. Desktop and web draw one card with a 1px hairline edge, each row drawing its share of the edge
 * (Paper "Settings · Porcelain"); a page's content card (Paper's List / Grouped) has 24 corners and no edge.
 */
const groupedCorners = {
  ios: {
    only: 'rounded-grouped',
    first: 'rounded-t-grouped',
    middle: '',
    last: 'rounded-b-grouped',
  },
  android: {
    only: 'rounded-grouped',
    first: 'rounded-t-grouped rounded-b-grouped-inner mb-0.5',
    middle: 'rounded-grouped-inner mb-0.5',
    last: 'rounded-b-grouped rounded-t-grouped-inner',
  },
  web: {
    only: 'rounded-2xl border border-hairline',
    first: 'rounded-t-2xl border-x border-t border-hairline',
    middle: 'border-x border-hairline',
    last: 'rounded-b-2xl border-x border-b border-hairline',
  },
  content: {
    only: 'rounded-3xl',
    first: 'rounded-t-3xl',
    middle: '',
    last: 'rounded-b-3xl',
  },
} satisfies Record<string, Record<ListPosition, string>>;

const sectionCorners = Platform.select({
  android: groupedCorners.android,
  web: groupedCorners.web,
  default: groupedCorners.ios,
});

const appearanceClasses = {
  plain: '',
  grouped: 'bg-card',
  cards:
    'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:bg-transparent web:wide:shadow-hairline',
};

export interface ItemDrawing {
  appearance: ListAppearance;
  position: ListPosition;
  menu: boolean;
  rows: RowDrawing;
}

// Only the web draws a page's content card apart from the kit's grouped card.
export const contentCard = (
  drawing: Pick<ItemDrawing, 'rows' | 'appearance'>,
): boolean =>
  Platform.OS === 'web' &&
  drawing.rows === 'content' &&
  drawing.appearance === 'grouped';

const cornersOf = (drawing: ItemDrawing): Record<ListPosition, string> =>
  contentCard(drawing) ? groupedCorners.content : sectionCorners;

// A muted row, such as an empty section's placeholder, has no surface, so it takes no corners or edge either.
function corners(
  drawing: ItemDrawing,
  tone: ListItemProps['tone'],
): string | undefined {
  return drawing.appearance === 'grouped' && tone !== 'muted'
    ? cornersOf(drawing)[drawing.position]
    : undefined;
}

// Paper's Combobox master: a popover's rows sit flat on it, 2px apart, each with the menu-row radius.
const menuGaps = {
  only: '',
  first: 'mb-0.5',
  middle: 'mb-0.5',
  last: '',
} satisfies Record<ListPosition, string>;

type SurfaceState = Pick<ListItemProps, 'selected' | 'tone'>;

// Paper's SettingsList: a sidebar row is its own rounded tile, flat on the glass.
const sidebarSurface = 'relative overflow-hidden rounded-xl';

export function itemSurface(drawing: ItemDrawing, state: SurfaceState): string {
  if (drawing.menu)
    return cn(
      'relative overflow-hidden rounded-xl',
      menuGaps[drawing.position],
    );

  if (drawing.rows === 'sidebar') return sidebarSurface;

  return rowSurface(drawing, state);
}

function rowSurface(
  drawing: ItemDrawing,
  { selected, tone }: SurfaceState,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' && appearanceClasses[drawing.appearance],
    corners(drawing, tone),
    selected && 'web:wide:shadow-none',
  );
}

// iOS separates every list's rows; desktop and web separate a grouped card's rows only; Android leaves rows apart.
function separatesRows(appearance: ListAppearance): boolean {
  if (Platform.OS === 'web') return appearance === 'grouped';

  return Platform.OS === 'ios' && appearance !== 'cards';
}

const separatedPositions = new Set<ListPosition>(['first', 'middle']);

// A popover's rows and a sidebar's sit apart, as tiles.
const tiled = (drawing: ItemDrawing): boolean =>
  drawing.menu || drawing.rows === 'sidebar';

function hasSeparator(drawing: ItemDrawing): boolean {
  if (tiled(drawing)) return false;

  return (
    separatesRows(drawing.appearance) &&
    separatedPositions.has(drawing.position)
  );
}

/*
 * The desktop card draws its separators in its own hairline, and holds its rows 16 from its edge at every width. A
 * page's content card draws them in the border colour, 20 from its right edge as its rows are.
 */
const separatorDrawings = {
  web: { colour: 'bg-hairline', end: 'right-4', pastLeading: 'left-14' },
  native: {
    colour: 'bg-border',
    end: 'right-4',
    pastLeading: 'left-14 wide:left-15',
  },
  content: { colour: 'bg-border', end: 'right-5', pastLeading: 'left-14' },
};

const separatorDrawing = (
  drawing: ItemDrawing,
): typeof separatorDrawings.web => {
  if (contentCard(drawing)) return separatorDrawings.content;

  return Platform.OS === 'web'
    ? separatorDrawings.web
    : separatorDrawings.native;
};

export function itemSeparator(
  drawing: ItemDrawing,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;
  const separator = separatorDrawing(drawing);

  return cn(
    'absolute bottom-0 left-4',
    separator.end,
    separator.colour,
    leading && separator.pastLeading,
  );
}
