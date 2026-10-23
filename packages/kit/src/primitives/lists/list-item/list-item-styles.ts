import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

const appearanceClasses = {
  plain: '',
  grouped: '',
  cards:
    'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:bg-transparent web:wide:shadow-hairline',
};

export interface ItemDrawing {
  appearance: ListAppearance;
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

function rowSurface(
  drawing: ItemDrawing,
  { selected, tone }: SurfaceState,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' && appearanceClasses[drawing.appearance],
    selected && 'web:wide:shadow-none',
  );
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
