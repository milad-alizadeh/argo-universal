import Check from '@expo/material-symbols/check.xml';
import {
  DropdownMenu,
  DropdownMenuItem,
  HorizontalDivider,
  Icon,
  Text,
} from '@expo/ui/jetpack-compose';
import { padding } from '@expo/ui/jetpack-compose/modifiers';
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
      {props.items.flatMap((item) => itemRows(item, choose))}
    </DropdownMenu.Items>
  );
}

// A row, after a divider when it starts a later section.
function itemRows(
  item: NativeMenuItem,
  choose: (item: NativeMenuItem) => void,
): React.JSX.Element[] {
  const row = <MenuItem key={item.id} item={item} onChoose={choose} />;

  return item.divided
    ? [<SectionDivider key={`divider.${item.id}`} />, row]
    : [row];
}

// Material sets a menu's groups apart with a divider and no heading, as MenuView's Android drawing of inline sections does; Argo binds its colour.
const dividerInset = 8;

const dividerModifiers = [padding(0, dividerInset, 0, dividerInset)];

function SectionDivider(): React.JSX.Element {
  return (
    <HorizontalDivider
      thickness={1}
      color={useNativeTheme().colors.border}
      modifiers={dividerModifiers}
    />
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
