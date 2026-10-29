import { ContextMenu } from '@expo/ui/swift-ui';
import type { ReactElement } from 'react';
import {
  swiftMenuSections,
  type NativeMenuItem,
} from '#primitives/overlays/menu';
import { moveMenuTitle } from './list-move-entries';
import { MoveMenuRow } from './list-native-move-items';
import type { NativeMoveMenuProps } from './list-native-move-menu';

/*
 * A movable row of a native grouped List opens its Move menu on a long press: Expo UI's ContextMenu, SwiftUI's
 * `.contextMenu`, around the row's own SwiftUI view, its entries a Section headed Move, as a ListItem's menu heads
 * them. A tap still reaches the row.
 */
const contextMenu = (
  items: NativeMenuItem[],
  row: ReactElement,
): ReactElement => (
  <ContextMenu>
    <ContextMenu.Items>
      {swiftMenuSections([{ title: moveMenuTitle, items }])}
    </ContextMenu.Items>
    <ContextMenu.Trigger>{row}</ContextMenu.Trigger>
  </ContextMenu>
);

export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  return <MoveMenuRow {...props} menu={contextMenu} />;
}
