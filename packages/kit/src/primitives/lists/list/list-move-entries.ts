import { stepMoves } from './list-move-menu';
import type { RowId } from './list-move-model';
import type { MoveOrder } from './list-move-order';

// What a row's Move menu is headed, on every platform.
export const moveMenuTitle = 'Move';

// The Move menu's last entry, which opens the Move to… picker.
export const moveToLabel = 'Move to…';

// One entry of a row's Move menu, keyed by what it does: `up`, `down` or `to`.
export interface MoveEntry {
  key: string;
  label: string;
  choose: () => void;
}

/*
 * A row's Move menu, built once for a ListItem's Actions and a native grouped List's menus alike: the steps that would
 * move it, then Move to….
 */
export const moveEntries = (order: MoveOrder, id: RowId): MoveEntry[] => [
  ...stepMoves(order.sections, id).map(({ key, label, intent }) => ({
    key,
    label,
    choose: () => order.moveBy(id, intent),
  })),
  { key: 'to', label: moveToLabel, choose: () => order.pick(id) },
];
