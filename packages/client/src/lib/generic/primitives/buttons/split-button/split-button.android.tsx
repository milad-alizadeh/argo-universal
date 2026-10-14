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
import { ChevronIcon } from './split-button-icons.android';
import { type NativeSplit, nativeSplit } from './split-button-items';
import { type HalfSide, halfLook } from './split-button-look.android';
import { MenuItems, type RunItem } from './split-button-menu.android';
import type { SplitButtonProps } from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

type HalfProps = Pick<NativeSplit, 'primary' | 'enabled'> & {
  side: HalfSide;
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

// M3's split button keeps its halves 2dp apart.
function SplitRow(split: NativeSplit): React.JSX.Element {
  const menu = useSplitMenu(split.enabled);

  return (
    <Row horizontalArrangement={{ spacedBy: 2 }}>
      <Half {...split} side="leading" onClick={split.acting.onPress}>
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
    <Half {...props} side="trailing" onClick={props.onOpen} modifiers={[label]}>
      <ChevronIcon />
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

// A filled button beside a filled primary action, otherwise the tonal one; Argo's colours, the split's corners.
function Half({
  primary,
  side,
  children,
  ...rest
}: HalfProps): React.JSX.Element {
  const Stock = primary ? Button : FilledTonalButton;
  const { colors } = useNativeTheme();

  return (
    <Stock {...halfLook(colors, primary, side)} {...rest}>
      {children}
    </Stock>
  );
}
