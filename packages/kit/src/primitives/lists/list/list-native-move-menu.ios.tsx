import { Button, ContextMenu, Section } from '@expo/ui/swift-ui';
import type { ReactElement } from 'react';
import type { NativeMenuItem } from '#primitives/overlays/menu';
import { useNativeMoveItems } from './list-native-move-items';
import type { NativeMoveMenuProps } from './list-native-move-menu';

const moveButton = (item: NativeMenuItem): ReactElement => (
  <Button key={item.id} label={item.title} onPress={item.choose} />
);

/*
 * A movable row of a native grouped List opens its Move menu on a long press: Expo UI's ContextMenu, SwiftUI's
 * `.contextMenu`, around the row's own SwiftUI view, its entries a Section headed Move, as a ListItem's menu heads
 * them. A tap still reaches the row.
 */
export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  const items = useNativeMoveItems(props.id);

  if (!items) return props.children;

  return (
    <ContextMenu>
      <ContextMenu.Items>
        <Section title="Move">{items.map(moveButton)}</Section>
      </ContextMenu.Items>
      <ContextMenu.Trigger>{props.children}</ContextMenu.Trigger>
    </ContextMenu>
  );
}
