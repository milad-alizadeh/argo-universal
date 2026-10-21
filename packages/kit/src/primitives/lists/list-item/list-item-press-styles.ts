import { Platform } from 'react-native';
import type { ListAppearance } from '../../../list-context';
import { tintTransitionClassName } from '../../../motion';
import type { RowDrawing } from '../../../row-drawing-context';
import { cn } from '../../../utils';
import {
  controlLines,
  pressLayouts,
  sidebarLayouts,
  type PressLayout,
} from './list-item-layouts';
import type { ListItemProps } from './list-item-props';
import { contentCard } from './list-item-styles';

const pressFocus = 'web:select-none web:rounded-inherit';

// A row drawing its own tile keeps that tile's corners instead of inheriting its card's.
const tileLayouts = new Set<PressLayout>(['card', 'content']);

const focusOf = (layout: PressLayout): string =>
  tileLayouts.has(layout) ? 'web:select-none' : pressFocus;

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
  appearance: ListAppearance;
} & Pick<ListItemProps, 'sidebar'>;

/*
 * A grouped card draws a pressed row as a rounded tile inset in the card on the web only. Both
 * phones fill the row edge to edge, the shape a stock grouped row and Material's ripple take.
 */
const tiledCard = (appearance: ListAppearance): boolean =>
  Platform.OS === 'web' && appearance === 'grouped';

function cardLayout(press: PressDrawing): PressLayout {
  if (contentCard(press)) return 'content';

  return tiledCard(press.appearance) ? 'card' : 'row';
}

// A sidebar List (Paper's SettingsList) draws its rows as tiles; others draw them by their card.
function listLayout(press: PressDrawing): PressLayout {
  return press.rows === 'sidebar' ? 'sidebar-tile' : cardLayout(press);
}

// A row's own sidebar option (Paper "SessionsList") comes before its List's drawing.
function rowLayout(press: PressDrawing): PressLayout {
  return press.sidebar ? sidebarLayouts[press.sidebar] : listLayout(press);
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
    focusOf(layoutOf(press)),
    press.interactive ? pressTints : readOnlyCursor,
  );
}
