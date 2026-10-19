// Stock Compose DropdownMenu: MenuView's Android drawing takes no container colour, so the menu builds the same tree with `color`.
import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { Pressable } from 'react-native';
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
        <MenuPress onPress={open}>
          <NativeMenuTrigger {...props} />
        </MenuPress>
      )}
    />
  );
}

type MenuPressProps = { onPress: () => void; children: React.ReactNode };

// As MenuView's Android trigger: the press opens the menu without its own sound, focus or accessibility node; the trigger inside names it.
function MenuPress(props: MenuPressProps): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <Pressable
        onPress={props.onPress}
        android_disableSound
        focusable={false}
        accessible={false}
      >
        {props.children}
      </Pressable>
    </RNHostView>
  );
}

Menu satisfies React.ComponentType<MenuProps<string>>;
