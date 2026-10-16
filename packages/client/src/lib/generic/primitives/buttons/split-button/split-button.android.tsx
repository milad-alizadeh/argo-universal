import {
  Button,
  type ButtonColors,
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
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { MenuDropdownItems } from '#primitives/overlays/menu';
import { ChevronIcon } from './split-button-icons.android';
import { type NativeSplit, nativeSplit } from './split-button-items';
import { type HalfSide, halfLook } from './split-button-look.android';
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
  show: () => void;
  close: () => void;
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
      <ActingHalf {...split} />
      <MenuHalf {...split} menu={menu} />
    </Row>
  );
}

function ActingHalf(split: NativeSplit): React.JSX.Element {
  return (
    <Half
      {...split}
      side="leading"
      onClick={split.acting.onPress}
      modifiers={actingName(split)}
    >
      <Text>{split.acting.label}</Text>
    </Half>
  );
}

// The acting button's spoken name, when its label says too little.
function actingName(split: NativeSplit): ModifierConfig[] {
  const name = split.acting.accessibilityLabel;

  return name ? [semantics({ contentDescription: name })] : [];
}

// The kit Menu's Compose DropdownMenu and rows, on the card surface, opened from the stock chevron button.
function MenuHalf({ menu, ...split }: MenuHalfProps): React.JSX.Element {
  const { roles } = useMaterialPalette();

  return (
    <DropdownMenu
      color={roles.surfaceContainer}
      expanded={menu.open}
      onDismissRequest={menu.close}
    >
      <DropdownMenu.Trigger>
        <ChevronHalf {...split} onOpen={menu.show} />
      </DropdownMenu.Trigger>
      <MenuDropdownItems items={split.items} onChosen={menu.close} />
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

  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}

// A filled button beside a filled primary action, otherwise the tonal one; Argo's colours, the split's corners.
function Half({
  primary,
  side,
  children,
  ...rest
}: HalfProps): React.JSX.Element {
  const Stock = primary ? Button : FilledTonalButton;
  const look = halfLook(useHalfColors(primary), side);

  return (
    <Stock {...look} {...rest}>
      {children}
    </Stock>
  );
}

function useHalfColors(primary: boolean): ButtonColors {
  const palette = useMaterialPalette();

  return primary ? palette.filledButtonColors : palette.tonalButtonColors;
}
