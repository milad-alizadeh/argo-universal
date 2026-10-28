import { useMemo, type ReactElement } from 'react';
import type { NativeMenuItem } from '#primitives/overlays/menu';
import { useListMoveOrder } from './list-move-context';
import { moveEntries, type MoveEntry } from './list-move-entries';
import type { RowId } from './list-move-model';
import { useMoveOrder, type MoveOrder } from './list-move-order';
import type { NativeMoveMenuProps } from './list-native-move-menu';

const moveItem = ({ key, label, choose }: MoveEntry): NativeMenuItem => ({
  id: key,
  title: label,
  disabled: false,
  choose,
});

const moveItems = (order: MoveOrder, id: RowId): NativeMenuItem[] =>
  moveEntries(order, id).map(moveItem);

/*
 * The Move menu of a native grouped List's row, as a ListItem's Move Section offers it: up and down a place, and
 * Move to…. Nothing for a row the List cannot move, or outside a List with `onMove`.
 */
function useNativeMoveItems(
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

type DrawMoveMenu = (
  items: NativeMenuItem[],
  row: ReactElement,
) => ReactElement;

// A native grouped List's row inside its platform's Move menu, or the bare row when the List cannot move it.
export function MoveMenuRow(
  props: NativeMoveMenuProps & { menu: DrawMoveMenu },
): ReactElement {
  const items = useNativeMoveItems(props.id);

  return items ? props.menu(items, props.children) : props.children;
}
