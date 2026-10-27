import { Platform } from 'react-native';
import { tintTransitionClassName } from '../../../motion';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import {
  controlLines,
  pressLayouts,
  type PressLayout,
} from './list-item-layouts';
import type { ListItemProps } from './list-item-props';

const pressFocus = 'web:select-none web:rounded-inherit';

// Pressed (4%) follows hover (2%) on the web, so a held row is darker than a hovered one.
const pressTints = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
  Platform.OS === 'ios' && 'active:bg-pressed',
);

// The web's Pressable draws a pointer cursor in an unlayered rule; a read-only row takes the page's.
const readOnlyCursor = 'web:cursor-auto!';

type PressDrawing = {
  menu: boolean;
  rows: RowDrawing;
  interactive: boolean;
  control: boolean;
  // A compact List's row on a wide window.
  compact: boolean;
} & Pick<ListItemProps, 'sidebar'>;

// A sidebar List (Paper's SettingsList) draws its rows as tiles; others draw them by their card.
function listLayout(press: PressDrawing): PressLayout {
  return press.rows === 'sidebar' ? 'sidebar-tile' : 'row';
}

// A compact List's row is one line: a sidebar's keeps the sidebar's insets (Paper "SessionsList"), others Paper "Issue row"'s.
function compactLayout(press: PressDrawing): PressLayout {
  return press.sidebar || press.rows === 'sidebar'
    ? 'sidebar-compact'
    : 'compact';
}

// A compact List's line comes first, then a row's own sidebar option (Paper "SessionsList"), then its List's drawing.
function rowLayout(press: PressDrawing): PressLayout {
  if (press.compact) return compactLayout(press);

  return press.sidebar ? 'sidebar' : listLayout(press);
}

const layoutOf = (press: PressDrawing): PressLayout =>
  press.menu ? 'menu' : rowLayout(press);

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
