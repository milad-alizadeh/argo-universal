import { Platform } from 'react-native';
import type { ListAppearance } from '../../../list-context';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import { contentCard } from './list-item-styles';

/*
 * A desktop or web grouped card holds its rows 16 from its edge (Paper "Settings · Porcelain"); other rows keep 20 on
 * wide, as a page's content card (Paper's List / Grouped) does. A sidebar row (Paper's SettingsList) is 48 high.
 */
const pressLayouts = {
  row: 'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5',
  card: 'w-full flex-row items-start gap-4 px-4 py-4',
  content: 'w-full flex-row items-start gap-4 px-5 py-4',
  menu: 'w-full min-h-9 flex-row items-start gap-2 rounded-xl p-2',
  sidebar: 'w-full min-h-12 flex-row items-center gap-3 px-4 py-1.5',
};

type PressLayout = keyof typeof pressLayouts;

const pressFocus = 'web:select-none web:rounded-inherit';

// Pressed (4%) follows hover (2%) on the web, so a held row is darker than a hovered one.
const pressTints = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  Platform.OS === 'ios' && 'active:bg-pressed',
);

// The web's Pressable draws a pointer cursor in an unlayered rule; a read-only row takes the page's.
const readOnlyCursor = 'web:cursor-auto!';

// Paper: a control wraps onto its own line, 12px under a menu row's title and 8px under a sheet row's.
const rowControlLine = 'flex-wrap gap-y-2';

const controlLines = {
  row: rowControlLine,
  card: rowControlLine,
  content: rowControlLine,
  menu: 'flex-wrap gap-y-3',
  sidebar: rowControlLine,
} satisfies Record<PressLayout, string>;

type PressDrawing = {
  menu: boolean;
  rows: RowDrawing;
  interactive: boolean;
  control: boolean;
  appearance: ListAppearance;
};

const webCard = (appearance: ListAppearance): boolean =>
  Platform.OS === 'web' && appearance === 'grouped';

function cardLayout(press: PressDrawing): PressLayout {
  if (contentCard(press)) return 'content';

  return webCard(press.appearance) ? 'card' : 'row';
}

function layoutOf(press: PressDrawing): PressLayout {
  if (press.menu) return 'menu';

  return press.rows === 'sidebar' ? 'sidebar' : cardLayout(press);
}

function pressLayout(press: PressDrawing): string {
  const layout = layoutOf(press);

  return cn(pressLayouts[layout], press.control && controlLines[layout]);
}

// Only a row that does something takes the hover and pressed tints; a read-only row stays still.
export function itemPress(press: PressDrawing): string {
  return cn(
    pressLayout(press),
    pressFocus,
    press.interactive ? pressTints : readOnlyCursor,
  );
}
