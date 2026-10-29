import type { ReactElement } from 'react';
import { RowLongPressContext } from '#primitives/fields/field-row';
import { MenuDropdown, type NativeMenuItem } from '#primitives/overlays/menu';
import { MoveMenuRow } from './list-native-move-items';
import type { NativeMoveMenuProps } from './list-native-move-menu';

/*
 * A movable row of a native grouped List opens its Move menu on a long press: Material's DropdownMenu at the row,
 * opened by the row's own Compose `combinedClickable` `onLongClick`, which keeps its tap. Android's menus draw no
 * title.
 */
const dropdownMenu = (
  items: NativeMenuItem[],
  row: ReactElement,
): ReactElement => (
  <MenuDropdown
    items={items}
    trigger={(open) => (
      <RowLongPressContext value={open}>{row}</RowLongPressContext>
    )}
  />
);

export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  return <MoveMenuRow {...props} menu={dropdownMenu} />;
}
