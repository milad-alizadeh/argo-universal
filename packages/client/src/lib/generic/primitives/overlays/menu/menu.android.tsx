// Stock Compose DropdownMenu: MenuView's Android drawing takes no container colour, so the menu builds the same tree with `color`.
import Check from '@expo/material-symbols/check.xml';
import { RNHostView } from '@expo/ui';
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  Text,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import {
  type NativeMenuItem,
  NativeMenuTrigger,
  nativeMenuItems,
} from './menu-native';
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
      <MenuItems {...props} onChosen={close} />
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

function MenuItems<Value extends string>(
  props: MenuProps<Value> & { onChosen: () => void },
): React.JSX.Element {
  const choose = (item: NativeMenuItem): void => {
    props.onChosen();
    item.choose();
  };

  return (
    <DropdownMenu.Items>
      {nativeMenuItems(props).map((item) => (
        <MenuItem key={item.id} item={item} onChoose={choose} />
      ))}
    </DropdownMenu.Items>
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

type MenuItemProps = {
  item: NativeMenuItem;
  onChoose: (item: NativeMenuItem) => void;
};

// Material's item: `enabled` greys a row that cannot run.
function MenuItem({ item, onChoose }: MenuItemProps): React.JSX.Element {
  return (
    <DropdownMenuItem
      enabled={!item.disabled}
      elementColors={useItemColors()}
      onClick={() => onChoose(item)}
    >
      <DropdownMenuItem.Text>
        <Text>{item.title}</Text>
      </DropdownMenuItem.Text>
      <ItemCheck checked={item.checked} />
    </DropdownMenuItem>
  );
}

// The check is the item's trailing icon, the Material Symbols check.
function ItemCheck(props: { checked?: boolean }): React.JSX.Element | null {
  if (!props.checked) return null;

  return (
    <DropdownMenuItem.TrailingIcon>
      <Icon source={Check} />
    </DropdownMenuItem.TrailingIcon>
  );
}

// The foreground for text and the check, muted while disabled or loading; Text and Icon inherit them as the content colour.
function useItemColors(): React.ComponentProps<
  typeof DropdownMenuItem
>['elementColors'] {
  const colors = useNativeTheme().colors;

  return {
    textColor: colors.foreground,
    disabledTextColor: colors.mutedForeground,
    trailingIconColor: colors.foreground,
    disabledTrailingIconColor: colors.mutedForeground,
  };
}

Menu satisfies React.ComponentType<MenuProps<string>>;
