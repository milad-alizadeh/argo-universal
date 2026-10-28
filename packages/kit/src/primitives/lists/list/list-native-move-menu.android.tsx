import type { ReactElement } from 'react';
import { RowLongPressContext } from '#primitives/fields/field-row';
import { MenuDropdownItems } from '#primitives/overlays/menu';
import { MenuDropdownShell } from '../../overlays/menu/menu-dropdown-shell.android';
import { useNativeMoveItems } from './list-native-move-items';
import type { NativeMoveMenuProps } from './list-native-move-menu';

/*
 * A movable row of a native grouped List opens its Move menu on a long press: Material's DropdownMenu at the row,
 * opened by the row's own Compose `combinedClickable` `onLongClick`, which keeps its tap. Android's menus draw no
 * title.
 */
export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  const items = useNativeMoveItems(props.id);

  if (!items) return props.children;

  return (
    <MenuDropdownShell
      trigger={(open) => (
        <RowLongPressContext value={open}>{props.children}</RowLongPressContext>
      )}
      items={(close) => <MenuDropdownItems items={items} onChosen={close} />}
    />
  );
}
