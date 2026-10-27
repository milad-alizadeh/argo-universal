import type { ListPosition } from '../../../list-context';
import type { ListLook } from '../../../list-look';
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

const cardClasses =
  'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:shadow-hairline';

export interface ItemDrawing {
  look: ListLook;
  position: ListPosition;
  // A compact List's row on a wide window.
  compact: boolean;
}

// Paper's Combobox master: a popover's rows sit flat on it, 2px apart, each with the menu-row radius.
const menuGaps = {
  only: '',
  first: 'mb-0.5',
  middle: 'mb-0.5',
  last: '',
} satisfies Record<ListPosition, string>;

type SurfaceState = Pick<ListItemProps, 'selected' | 'tone' | 'sidebar'>;

// Paper's SettingsList: a sidebar row is its own rounded tile, flat on the glass.
const sidebarSurface = 'relative overflow-hidden rounded-xl';

export function itemSurface(drawing: ItemDrawing, state: SurfaceState): string {
  if (drawing.look.menu)
    return cn(
      'relative overflow-hidden rounded-xl',
      menuGaps[drawing.position],
    );

  return ownTile(drawing, state) ?? rowSurface(drawing, state);
}

// A sidebar row and a plain compact row are each their own rounded tile.
function ownTile(
  drawing: ItemDrawing,
  state: SurfaceState,
): string | undefined {
  if (drawing.look.sidebar) return sidebarSurface;

  return compactTile(drawing, state) ? compactSurface : undefined;
}

// Paper "Issue row": a plain compact row is its own rounded tile, so its hover and selected tints sit inset.
const compactSurface = 'relative overflow-hidden rounded-md';

const compactTile = (
  { compact, look }: ItemDrawing,
  { sidebar }: SurfaceState,
): boolean => compact && look.appearance === 'plain' && !sidebar;

// A muted row, such as an empty section's placeholder, has no surface, so it takes no corners either.
function corners(
  { look, position }: ItemDrawing,
  tone: ListItemProps['tone'],
): string | undefined {
  if (tone === 'muted' || !look.phone) return undefined;

  return phoneCorners[look.phone][position];
}

// A phone's grouped card is a plate under its rows; the web draws its own cell frame.
const surfaceClasses = (look: ListLook): string => {
  if (look.appearance === 'cards') return cardClasses;

  return look.phone ? 'bg-card' : '';
};

function rowSurface(
  drawing: ItemDrawing,
  { selected, tone }: SurfaceState,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' && surfaceClasses(drawing.look),
    corners(drawing, tone),
    selected && 'web:wide:shadow-none',
  );
}

const separatedPositions = new Set<ListPosition>(['first', 'middle']);

// A popover's rows and a sidebar's sit apart, as tiles.
const tiled = (drawing: ItemDrawing): boolean =>
  drawing.look.menu || drawing.look.sidebar;

function hasSeparator(drawing: ItemDrawing): boolean {
  if (tiled(drawing)) return false;

  return drawing.look.separated && separatedPositions.has(drawing.position);
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
