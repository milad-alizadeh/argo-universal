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
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { MenuDropdownItemsProps } from './menu-dropdown-items-props';
import { MenuDropdownShell } from './menu-dropdown-shell.android';
import { useItemColors } from './menu-item-colors.android';
import { ItemLeadingIcon } from './menu-item-icon.android';
import { dividedItems, type NativeMenuItem } from './menu-native-items';
import { SubmenuRow } from './menu-submenu-row.android';

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

type Choose = (item: NativeMenuItem) => void;

// A row, after a divider when it starts a later section.
function itemRows(item: NativeMenuItem, choose: Choose): React.JSX.Element[] {
  const row = <ItemRow key={item.id} item={item} onChoose={choose} />;

  return item.divided
    ? [<SectionDivider key={`divider.${item.id}`} />, row]
    : [row];
}

function ItemRow(props: MenuItemProps): React.JSX.Element {
  if (props.item.submenu) return <SubmenuItem {...props} />;

  return <MenuItem {...props} />;
}

/*
 * A submenu row opens its own stock DropdownMenu from the row, as Expo UI's MenuView builds a nested menu on
 * Android; Material's trailing arrow marks it. Choosing one of its rows closes both menus.
 */
function SubmenuItem({ item, onChoose }: MenuItemProps): React.JSX.Element {
  return (
    <MenuDropdownShell
      trigger={(open) => <SubmenuRow item={item} onOpen={open} />}
      items={(close) => (
        <SubmenuRows item={item} onChoose={closing(close, onChoose)} />
      )}
    />
  );
}

const closing =
  (close: () => void, choose: Choose): Choose =>
  (item) => {
    close();
    choose(item);
  };

function SubmenuRows({ item, onChoose }: MenuItemProps): React.JSX.Element {
  const rows = dividedItems(item.submenu ?? []);

  return (
    <DropdownMenu.Items>
      {rows.flatMap((row) => itemRows(row, onChoose))}
    </DropdownMenu.Items>
  );
}

// Material sets a menu's groups apart with a divider and no heading, as MenuView's Android drawing of inline sections does; Argo binds its colour.
const dividerInset = 8;

const dividerModifiers = [padding(0, dividerInset, 0, dividerInset)];

function SectionDivider(): React.JSX.Element {
  return (
    <HorizontalDivider
      thickness={1}
      color={useMaterialPalette().roles.outlineVariant}
      modifiers={dividerModifiers}
    />
  );
}

type MenuItemProps = {
  item: NativeMenuItem;
  onChoose: Choose;
};

// Material's item: `enabled` greys a row that cannot run.
function MenuItem({ item, onChoose }: MenuItemProps): React.JSX.Element {
  return (
    <DropdownMenuItem
      enabled={!item.disabled}
      elementColors={useItemColors(item)}
      onClick={() => onChoose(item)}
    >
      <ItemLeadingIcon {...item} onPress={() => onChoose(item)} />
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

MenuDropdownItems satisfies React.ComponentType<MenuDropdownItemsProps>;
