import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { IconSlot } from '#primitives/content/icon';
import { SelectedCheck } from '#primitives/status/selected-check';
import { useChoiceGutter } from './menu-choice-gutter';
import type { MenuAction } from './menu-props';

// An action that can be the selected one is a radio row, as the native menus check it.
export function choiceRole(
  selected: boolean | undefined,
): Pick<RadixMenu.DropdownMenuItemProps, 'role' | 'aria-checked'> {
  if (selected === undefined) return {};

  return { role: 'menuitemradio', 'aria-checked': selected };
}

// The leading check on the selected action, as every popover row (owner, 2026-10-20); in a menu with a row that can be ticked, the others keep its place, so icons and labels line up.
export function ChoiceCheck({
  selected,
}: Pick<MenuAction, 'selected'>): React.JSX.Element | null {
  const kept = useChoiceGutter();

  return selected === undefined && !kept ? null : (
    <CheckSlot selected={selected} />
  );
}

function CheckSlot({
  selected,
}: Pick<MenuAction, 'selected'>): React.JSX.Element {
  return (
    <IconSlot>
      {selected ? <SelectedCheck className="text-foreground" /> : null}
    </IconSlot>
  );
}
