import { Platform } from 'react-native';
import type {
  ListAppearance,
  ListCardStyle,
  ListPosition,
} from '../../../list-context';
import { isPhoneGrouped } from '../../../list-grouped';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

/*
 * A phone's grouped List draws a section as one card of ListItems (ADR-0042, owner 2026-10-24): each row is its share of
 * the card, rounded by its position. iOS draws one plate, with separators. Android draws segments: small inner corners
 * and a 2dp gap instead of separators. The web draws its own cell frame (list-grouped-cell).
 */
const phoneCorners = {
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
} satisfies Record<string, Record<ListPosition, string>>;

const sectionCorners =
  Platform.OS === 'android' ? phoneCorners.android : phoneCorners.ios;

const appearanceClasses = {
  plain: '',
  grouped: Platform.OS === 'web' ? '' : 'bg-card',
  cards:
    'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:bg-transparent web:wide:shadow-hairline',
};

export interface ItemDrawing {
  appearance: ListAppearance;
  cardStyle?: ListCardStyle;
  position: ListPosition;
  menu: boolean;
  rows: RowDrawing;
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

// A muted row, such as an empty section's placeholder, has no surface, so it takes no corners either.
function corners(
  drawing: ItemDrawing,
  tone: ListItemProps['tone'],
): string | undefined {
  if (tone === 'muted' || !isPhoneGrouped(drawing.appearance)) return undefined;

  return sectionCorners[drawing.position];
}

function rowSurface(
  drawing: ItemDrawing,
  { selected, tone }: SurfaceState,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' &&
      cn(appearanceClasses[drawing.appearance], cardFill(drawing)),
    corners(drawing, tone),
    selected && 'web:wide:shadow-none',
  );
}

function cardFill(drawing: ItemDrawing): string | undefined {
  return drawing.appearance === 'cards' && drawing.cardStyle === 'filled'
    ? 'web:wide:bg-card'
    : undefined;
}

// iOS separates a plain list's rows; the web and Android leave rows apart.
function separatesRows(appearance: ListAppearance): boolean {
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

const separatorDrawing = {
  colour: 'bg-border',
  end: 'right-4',
  pastLeading: 'left-14 wide:left-15',
};

// A selected row's tint fills the row edge to edge.
export const selectionTint = 'absolute inset-0 bg-selected';

export function itemSeparator(
  drawing: ItemDrawing,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;

  return cn(
    'absolute bottom-0 left-4',
    separatorDrawing.end,
    separatorDrawing.colour,
    leading && separatorDrawing.pastLeading,
  );
}
