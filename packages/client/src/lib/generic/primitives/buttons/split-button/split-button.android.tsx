import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  FilledTonalButton,
  RNHostView,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  selectable,
  semantics,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Icon } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Host } from '#primitives/native/host';
import {
  type NativeSplit,
  type SplitMenuItem,
  nativeSplit,
} from './split-button-items';
import type { SplitButtonProps } from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

type HalfProps = Pick<NativeSplit, 'primary' | 'enabled'> & {
  onClick?: () => void;
  modifiers?: ModifierConfig[];
  children: React.ReactNode;
};

interface SplitMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  // Closes the menu, then runs what the item does.
  run: (press: () => void) => void;
}

type MenuHalfProps = NativeSplit & { menu: SplitMenuState };

// Two stock M3 buttons side by side; the chevron opens the stock M3 DropdownMenu.
export function SplitButton<Value extends string>(
  props: SplitButtonProps<Value>,
): React.JSX.Element {
  return (
    <Host matchContents>
      <SplitRow {...nativeSplit(props)} />
    </Host>
  );
}

function SplitRow(split: NativeSplit): React.JSX.Element {
  const menu = useSplitMenu(split.enabled);

  return (
    <Row horizontalArrangement={{ spacedBy: 2 }}>
      <Half {...split} onClick={split.acting.onPress}>
        <Text>{split.acting.label}</Text>
      </Half>
      <MenuHalf {...split} menu={menu} />
    </Row>
  );
}

function MenuHalf({ menu, ...split }: MenuHalfProps): React.JSX.Element {
  return (
    <DropdownMenu
      expanded={menu.open}
      onDismissRequest={() => menu.setOpen(false)}
    >
      <DropdownMenu.Trigger>
        <ChevronHalf {...split} onOpen={() => menu.setOpen(true)} />
      </DropdownMenu.Trigger>
      <MenuItems items={split.items} run={menu.run} />
    </DropdownMenu>
  );
}

function MenuItems(props: {
  items: SplitMenuItem[];
  run: SplitMenuState['run'];
}): React.JSX.Element {
  return (
    <DropdownMenu.Items>
      {props.items.map((item) => (
        <MenuItem key={item.label} item={item} run={props.run} />
      ))}
    </DropdownMenu.Items>
  );
}

function ChevronHalf(
  props: NativeSplit & { onOpen: () => void },
): React.JSX.Element {
  const label = semantics({ contentDescription: props.menuLabel });

  return (
    <Half {...props} onClick={props.onOpen} modifiers={[label]}>
      <RNHostView matchContents>
        <Icon name="chevron-down" role="control" />
      </RNHostView>
    </Half>
  );
}

// The menu closes after a pick, and when the split turns disabled.
function useSplitMenu(enabled: boolean): SplitMenuState {
  const [open, setOpen] = useState(false);

  if (!enabled && open) setOpen(false);

  const run = (press: () => void): void => {
    setOpen(false);
    press();
  };

  return { open, setOpen, run };
}

// A stock menu item; a choice is selectable and the chosen one carries a check.
function MenuItem(props: {
  item: SplitMenuItem;
  run: SplitMenuState['run'];
}): React.JSX.Element {
  const { item } = props;
  const press = (): void => props.run(item.onPress);

  return (
    <DropdownMenuItem modifiers={itemModifiers(item, press)} onClick={press}>
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

function ItemCheck(): React.JSX.Element {
  return (
    <DropdownMenuItem.TrailingIcon>
      <RNHostView matchContents>
        <SelectedCheck />
      </RNHostView>
    </DropdownMenuItem.TrailingIcon>
  );
}

// A filled button beside a filled primary action; otherwise the tonal one.
function Half(props: HalfProps): React.JSX.Element {
  const Stock = props.primary ? Button : FilledTonalButton;

  return (
    <Stock
      enabled={props.enabled}
      onClick={props.onClick}
      modifiers={props.modifiers}
    >
      {props.children}
    </Stock>
  );
}
