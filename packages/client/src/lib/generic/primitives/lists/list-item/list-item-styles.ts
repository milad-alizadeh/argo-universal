import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { cn } from '../../../utils';

const groupedCorners = {
  only: 'rounded-grouped web:wide:rounded-3xl',
  first:
    'rounded-t-grouped web:wide:rounded-t-3xl android:rounded-b-grouped-inner android:mb-0.5',
  middle: 'android:rounded-grouped-inner android:mb-0.5',
  last: 'rounded-b-grouped web:wide:rounded-b-3xl android:rounded-t-grouped-inner',
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

export function itemSurface(
  { appearance, position, menu }: ItemDrawing,
  selected?: boolean,
): string {
  if (menu)
    return cn('relative overflow-hidden rounded-xl', menuGaps[position]);

  return cn(
    'relative overflow-hidden',
    appearanceClasses[appearance],
    corners(appearance, position),
    selected && 'web:wide:shadow-inset',
  );
}

const pressLayouts = {
  row: 'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5',
  menu: 'w-full min-h-9 flex-row items-start gap-2 rounded-xl p-2',
};

const pressFocus =
  'web:select-none web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2';

const pressTints = cn(
  'web:hover:bg-hover',
  Platform.OS !== 'android' && 'active:bg-pressed',
);

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
  return cn(pressLayout(press), pressFocus, press.interactive && pressTints);
}

function hasSeparator({ appearance, position, menu }: ItemDrawing): boolean {
  return (
    !menu && appearance !== 'cards' && ['first', 'middle'].includes(position)
  );
}

export function itemSeparator(
  drawing: ItemDrawing,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;

  return cn(
    'absolute bottom-0 right-4 left-4 bg-border android:hidden',
    leading && 'left-14 wide:left-15',
  );
}
