import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { cn } from '../../../utils';
import {
  controlLines,
  pressLayouts,
  sidebarLayouts,
} from './list-item-layouts';
import type { ListItemProps } from './list-item-props';

/*
 * A grouped List's section shape. iOS draws one plate. Android draws segments: small inner corners and a gap instead
 * of separators. Desktop and web draw one card with a 1px hairline edge, each row drawing its share of the edge
 * (Paper "Settings · Porcelain").
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

// A muted row, such as an empty section's placeholder, has no surface, so it takes no corners or edge either.
function corners(
  { appearance, position }: Omit<ItemDrawing, 'menu'>,
  tone: ListItemProps['tone'],
): string | undefined {
  return appearance === 'grouped' && tone !== 'muted'
    ? sectionCorners[position]
    : undefined;
}

// Paper's Combobox master: a popover's rows sit flat on it, 2px apart, each with the menu-row radius.
const menuGaps = {
  only: '',
  first: 'mb-0.5',
  middle: 'mb-0.5',
  last: '',
} satisfies Record<ListPosition, string>;

export interface ItemDrawing {
  appearance: ListAppearance;
  position: ListPosition;
  menu: boolean;
}

type SurfaceState = Pick<ListItemProps, 'selected' | 'tone'>;

export function itemSurface(drawing: ItemDrawing, state: SurfaceState): string {
  if (drawing.menu)
    return cn(
      'relative overflow-hidden rounded-xl',
      menuGaps[drawing.position],
    );

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

const pressFocus = 'web:select-none web:rounded-inherit';

// Pressed (4%) follows hover (2%) on the web, so a held row is darker than a hovered one.
const pressTints = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  Platform.OS === 'ios' && 'active:bg-pressed',
);

// The web's Pressable draws a pointer cursor in an unlayered rule; a read-only row takes the page's.
const readOnlyCursor = 'web:cursor-auto!';

type PressDrawing = {
  menu: boolean;
  interactive: boolean;
  appearance: ListAppearance;
} & Pick<ListItemProps, 'control' | 'sidebar'>;

const plainLayout = (appearance: ListAppearance): 'card' | 'row' =>
  Platform.OS === 'web' && appearance === 'grouped' ? 'card' : 'row';

function layoutOf({
  menu,
  appearance,
  sidebar,
}: PressDrawing): keyof typeof pressLayouts {
  if (menu) return 'menu';

  return sidebar ? sidebarLayouts[sidebar] : plainLayout(appearance);
}

function pressLayout(press: PressDrawing): string {
  const layout = layoutOf(press);

  return cn(
    pressLayouts[layout],
    press.control !== undefined && controlLines[layout],
  );
}

// Only a row that does something takes the hover and pressed tints; a read-only row stays still.
export function itemPress(press: PressDrawing): string {
  return cn(
    pressLayout(press),
    pressFocus,
    press.interactive ? pressTints : readOnlyCursor,
  );
}

// iOS separates every list's rows; desktop and web separate a grouped card's rows only; Android leaves rows apart.
function separatesRows(appearance: ListAppearance): boolean {
  if (Platform.OS === 'web') return appearance === 'grouped';

  return Platform.OS === 'ios' && appearance !== 'cards';
}

const separatedPositions = new Set<ListPosition>(['first', 'middle']);

function hasSeparator(drawing: ItemDrawing): boolean {
  if (drawing.menu) return false;

  return (
    separatesRows(drawing.appearance) &&
    separatedPositions.has(drawing.position)
  );
}

// The desktop card draws its separators in its own hairline, and holds its rows 16 from its edge at every width.
const separatorDrawing = Platform.select({
  web: { colour: 'bg-hairline', pastLeading: 'left-14' },
  default: { colour: 'bg-border', pastLeading: 'left-14 wide:left-15' },
});

export function itemSeparator(
  drawing: ItemDrawing,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;

  return cn(
    'absolute bottom-0 right-4 left-4',
    separatorDrawing.colour,
    leading && separatorDrawing.pastLeading,
  );
}
