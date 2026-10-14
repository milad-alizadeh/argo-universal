import { DropdownMenu, DropdownMenuItem, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  selectable,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ItemCheck } from './split-button-icons.android';
import type { SplitMenuItem } from './split-button-items';

// Closes the menu, then runs what the item does.
export type RunItem = (press: () => void) => void;

interface MenuItemProps {
  item: SplitMenuItem;
  run: RunItem;
  textColor?: string;
}

// The split's stock menu items, in Argo's foreground colour.
export function MenuItems(props: {
  items: SplitMenuItem[];
  run: RunItem;
}): React.JSX.Element {
  const textColor = useNativeTheme().colors.foreground;
  const { run } = props;

  return (
    <DropdownMenu.Items>
      {props.items.map((item) => (
        <MenuItem key={item.label} {...{ item, run, textColor }} />
      ))}
    </DropdownMenu.Items>
  );
}

// A stock menu item; a choice is selectable and the chosen one carries a check.
function MenuItem({ item, run, textColor }: MenuItemProps): React.JSX.Element {
  const press = (): void => run(item.onPress);

  return (
    <DropdownMenuItem
      elementColors={{ textColor }}
      modifiers={itemModifiers(item, press)}
      onClick={press}
    >
      <DropdownMenuItem.Text>
        <Text>{item.label}</Text>
      </DropdownMenuItem.Text>
      {item.selected && <ItemCheck />}
    </DropdownMenuItem>
  );
}

function itemModifiers(
  item: SplitMenuItem,
  press: () => void,
): ModifierConfig[] {
  if (item.selected === undefined) return [];

  return [selectable(item.selected, press, 'radioButton')];
}
