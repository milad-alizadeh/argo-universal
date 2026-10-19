// Stock Compose DropdownMenu: MenuView's Android drawing takes no container colour, so the menu builds the same tree with `color`.
import type * as React from 'react';
import { HostedPress } from '#primitives/native/button-icon';
import { Host } from '#primitives/native/host';
import { MenuDropdown } from './menu-dropdown';
import { nativeMenuItems } from './menu-native-items';
import { NativeMenuTrigger } from './menu-phone-parts';
import type { MenuProps } from './menu-props';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  if (props.disabled) return <NativeMenuTrigger {...props} />;

  return (
    <Host matchContents>
      <OpenableMenu {...props} />
    </Host>
  );
}

function OpenableMenu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  return (
    <MenuDropdown
      items={nativeMenuItems(props)}
      trigger={(open) => (
        <HostedPress onPress={open}>
          <NativeMenuTrigger {...props} />
        </HostedPress>
      )}
    />
  );
}

Menu satisfies React.ComponentType<MenuProps<string>>;
