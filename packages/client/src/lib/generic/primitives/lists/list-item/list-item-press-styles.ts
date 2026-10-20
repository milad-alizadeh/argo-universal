import { Platform } from 'react-native';
import type { ListAppearance } from '../../../list-context';
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

// Pressed (4%) follows hover (2%) on the web, so a held row is darker than a hovered one.
const pressTints = cn(
  'web:hover:bg-hover web:active:bg-pressed',
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
  avatar: boolean;
} & Pick<ListItemProps, 'sidebar'>;

const webCard = (appearance: ListAppearance): boolean =>
  Platform.OS === 'web' && appearance === 'grouped';

function cardLayout(press: PressDrawing): PressLayout {
  if (contentCard(press)) return 'content';

  return webCard(press.appearance) ? 'card' : 'row';
}

// A sidebar List (Paper's SettingsList) draws its rows as tiles; others draw them by their card.
function listLayout(press: PressDrawing): PressLayout {
  return press.rows === 'sidebar' ? 'sidebar-tile' : cardLayout(press);
}

// An avatar row (Paper "Components / SubagentRow") has its own lanes, in a sidebar or on a phone.
const avatarLayout = (press: PressDrawing): PressLayout =>
  press.sidebar ? 'sidebar-avatar' : 'avatar';

// A row's own sidebar option (Paper "SessionsList") comes before its List's drawing.
function rowLayout(press: PressDrawing): PressLayout {
  if (press.avatar) return avatarLayout(press);

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
    pressFocus,
    press.interactive ? pressTints : readOnlyCursor,
  );
}
