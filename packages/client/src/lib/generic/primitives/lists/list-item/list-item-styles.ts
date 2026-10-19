import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

// Android and web draw a grouped List as segments: small inner corners and a gap instead of separators.
const groupedCorners = {
  only: 'rounded-grouped web:wide:rounded-3xl',
  first:
    'rounded-t-grouped web:wide:rounded-t-3xl android:rounded-b-grouped-inner android:mb-0.5 web:rounded-b-grouped-inner web:mb-0.5',
  middle:
    'android:rounded-grouped-inner android:mb-0.5 web:rounded-grouped-inner web:mb-0.5',
  last: 'rounded-b-grouped web:wide:rounded-b-3xl android:rounded-t-grouped-inner web:rounded-t-grouped-inner',
} satisfies Record<ListPosition, string>;

const appearanceClasses = {
  plain: '',
  grouped: 'bg-card',
  cards:
    'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:bg-transparent web:wide:shadow-hairline',
};

function corners(
  appearance: ListAppearance,
  position: ListPosition,
): string | undefined {
  return appearance === 'grouped' ? groupedCorners[position] : undefined;
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
  { appearance, position }: ItemDrawing,
  { selected, tone }: SurfaceState,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' && appearanceClasses[appearance],
    corners(appearance, position),
    selected && 'web:wide:shadow-none',
  );
}

const pressLayouts = {
  row: 'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5',
  menu: 'w-full min-h-9 flex-row items-start gap-2 rounded-xl p-2',
};

const pressFocus = 'web:select-none web:rounded-[inherit]';

// Pressed (4%) follows hover (2%) on the web, so a held row is darker than a hovered one.
const pressTints = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  Platform.OS === 'ios' && 'active:bg-pressed',
);

// The web's Pressable draws a pointer cursor in an unlayered rule; a read-only row takes the page's.
const readOnlyCursor = 'web:cursor-auto!';

// Paper: a control wraps onto its own line, 12px under a menu row's title and 8px under a sheet row's.
const controlLines = {
  row: 'flex-wrap gap-y-2',
  menu: 'flex-wrap gap-y-3',
};

type PressDrawing = { menu: boolean; interactive: boolean; control: boolean };

function pressLayout({ menu, control }: PressDrawing): string {
  const layout = menu ? 'menu' : 'row';

  return cn(pressLayouts[layout], control && controlLines[layout]);
}

// Only a row that does something takes the hover and pressed tints; a read-only row stays still.
export function itemPress(press: PressDrawing): string {
  return cn(
    pressLayout(press),
    pressFocus,
    press.interactive ? pressTints : readOnlyCursor,
  );
}

// Only iOS draws separators; Android and web leave rows apart.
const separatorPlatform = Platform.OS === 'ios';

const separatedRow = ({ appearance, position }: ItemDrawing): boolean =>
  appearance !== 'cards' && ['first', 'middle'].includes(position);

function hasSeparator(drawing: ItemDrawing): boolean {
  return separatorPlatform && !drawing.menu && separatedRow(drawing);
}

export function itemSeparator(
  drawing: ItemDrawing,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;

  return cn(
    'absolute bottom-0 right-4 left-4 bg-border',
    leading && 'left-14 wide:left-15',
  );
}
