import {
  Button,
  DropdownMenu,
  FilledTonalButton,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  semantics,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { halfColors } from './split-button-colors.android';
import { ChevronIcon } from './split-button-icons.android';
import { type NativeSplit, nativeSplit } from './split-button-items';
import { MenuItems, type RunItem } from './split-button-menu.android';
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
  run: RunItem;
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

// The menu sits on the card surface, as Paper's popover does.
function MenuHalf({ menu, ...split }: MenuHalfProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenu
      color={colors.card}
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

function ChevronHalf(
  props: NativeSplit & { onOpen: () => void },
): React.JSX.Element {
  const label = semantics({ contentDescription: props.menuLabel });

  return (
    <Half {...props} onClick={props.onOpen} modifiers={[label]}>
      <ChevronIcon primary={props.primary} />
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

// A filled button beside a filled primary action, otherwise the tonal one; both in Argo's colours.
function Half(props: HalfProps): React.JSX.Element {
  const Stock = props.primary ? Button : FilledTonalButton;
  const { colors } = useNativeTheme();

  return (
    <Stock
      colors={halfColors(colors, props.primary)}
      enabled={props.enabled}
      onClick={props.onClick}
      modifiers={props.modifiers}
    >
      {props.children}
    </Stock>
  );
}
