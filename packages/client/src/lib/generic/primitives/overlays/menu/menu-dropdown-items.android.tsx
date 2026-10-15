import Check from '@expo/material-symbols/check.xml';
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  Text,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { MenuDropdownItemsProps } from './menu-dropdown-items-props';
import type { NativeMenuItem } from './menu-native-items';

// The rows of a Compose DropdownMenu, shared by the Menu and the SplitButton's chevron.
export function MenuDropdownItems(
  props: MenuDropdownItemsProps,
): React.JSX.Element {
  const choose = (item: NativeMenuItem): void => {
    props.onChosen();
    item.choose();
  };

  return (
    <DropdownMenu.Items>
      {props.items.map((item) => (
        <MenuItem key={item.id} item={item} onChoose={choose} />
      ))}
    </DropdownMenu.Items>
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

MenuDropdownItems satisfies React.ComponentType<MenuDropdownItemsProps>;
