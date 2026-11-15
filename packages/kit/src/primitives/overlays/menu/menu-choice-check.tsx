import type * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { createContext, use } from 'react';
import { IconSlot } from '#primitives/content/icon';
import { SelectedCheck } from '#primitives/status/selected-check';

// Set inside a menu with a row that can be ticked: every row then keeps the check's place, so icons and labels line up.
export const ChoiceGutterContext = createContext(false);

// Whether any row of the menu can be ticked.
export const hasChoice = (rows: readonly object[]): boolean =>
  rows.some((row) => 'selected' in row && row.selected !== undefined);

// A row keeps the check's place when it can be ticked itself, or when another row of its menu can.
const useKeepsCheck = (selected: boolean | undefined): boolean =>
  use(ChoiceGutterContext) || selected !== undefined;

// An action that can be the selected one is a radio row, as the native menus check it.
export function choiceRole(
  selected: boolean | undefined,
): Pick<RadixMenu.DropdownMenuItemProps, 'role' | 'aria-checked'> {
  if (selected === undefined) return {};

  return { role: 'menuitemradio', 'aria-checked': selected };
}

// The leading check on the selected action, as every popover row (owner, 2026-10-20).
export function ChoiceCheck({
  selected,
}: {
  selected?: boolean;
}): React.JSX.Element | null {
  if (!useKeepsCheck(selected)) return null;

  return (
    <IconSlot>
      {selected ? <SelectedCheck className="text-foreground" /> : null}
    </IconSlot>
  );
}
