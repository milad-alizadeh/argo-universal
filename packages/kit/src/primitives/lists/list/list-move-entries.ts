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

// On a board, one entry for each column the card may move to, landing it at that column's top.
const columnEntries = (order: MoveOrder, id: RowId): MoveEntry[] =>
  order.sections
    .filter((section) => order.allows(id, section.key))
    .map((section) => ({
      key: `to ${section.key}`,
      label: `Move to ${section.title ?? section.id ?? ''}`,
      choose: () =>
        order.moveBy(id, {
          kind: 'place',
          place: { sectionKey: section.key, insertion: 0 },
        }),
    }));

/*
 * A row's Move menu, built once for a ListItem's Actions and a native grouped List's menus alike: the steps that would
 * move it, then Move to…. A board's card lists the columns it may move to instead.
 */
export const moveEntries = (order: MoveOrder, id: RowId): MoveEntry[] =>
  order.board ? columnEntries(order, id) : listEntries(order, id);

const listEntries = (order: MoveOrder, id: RowId): MoveEntry[] => [
  ...stepMoves(order.sections, id).map(({ key, label, intent }) => ({
    key,
    label,
    choose: () => order.moveBy(id, intent),
  })),
  { key: 'to', label: moveToLabel, choose: () => order.pick(id) },
];
