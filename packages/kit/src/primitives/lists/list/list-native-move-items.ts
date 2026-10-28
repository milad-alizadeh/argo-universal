import { useMemo } from 'react';
import type { NativeMenuItem } from '#primitives/overlays/menu';
import { pressed } from './list-move-actions';
import { useListMoveOrder } from './list-move-context';
import { stepMoves } from './list-move-menu';
import type { RowId } from './list-move-model';
import { useMoveOrder, type MoveOrder } from './list-move-order';

const moveItems = (order: MoveOrder, id: RowId): NativeMenuItem[] => [
  ...stepMoves(order.sections, id).map(({ key, label, intent }) => ({
    id: key,
    title: label,
    disabled: false,
    choose: () => pressed(order, id, intent),
  })),
  {
    id: 'to',
    title: 'Move to…',
    disabled: false,
    choose: () => order.pick(id),
  },
];

/*
 * The Move menu of a native grouped List's row, as a ListItem's Move Section offers it: up and down a place, and
 * Move to…. Nothing for a row the List cannot move, or outside a List with `onMove`.
 */
export function useNativeMoveItems(
  id: RowId | undefined,
): NativeMenuItem[] | undefined {
  const order = useListMoveOrder();
  const menu = useMoveOrder(order, (each) => each.menuOf(id));

  // A row with a menu is in a List with `onMove`, under a move id.
  const moves = menu === undefined ? undefined : order;

  return useMemo(
    () => (moves && id !== undefined ? moveItems(moves, id) : undefined),
    [moves, id],
  );
}
