// Stock Compose DropdownMenu: MenuView's Android drawing takes no container colour, so the menu builds the same tree with `color`.
import { RNHostView } from '@expo/ui';
import { DropdownMenu } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { MenuDropdownItems } from './menu-dropdown-items';
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

// DropdownMenu is controlled: `expanded` shows it, `onDismissRequest` closes it on an outside tap or back.
function OpenableMenu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const close = (): void => setExpanded(false);
  const color = useNativeTheme().colors.card;

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close} color={color}>
      <MenuTrigger menu={props} onPress={() => setExpanded(true)} />
      <MenuDropdownItems items={nativeMenuItems(props)} onChosen={close} />
    </DropdownMenu>
  );
}

function MenuTrigger<Value extends string>(props: {
  menu: MenuProps<Value>;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <DropdownMenu.Trigger>
      <MenuPress onPress={props.onPress}>
        <NativeMenuTrigger {...props.menu} />
      </MenuPress>
    </DropdownMenu.Trigger>
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
