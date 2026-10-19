import type { ReactElement } from 'react';
import { MenuDropdownItems } from './menu-dropdown-items';
import type { MenuDropdownProps } from './menu-dropdown-props';
import { MenuDropdownShell } from './menu-dropdown-shell.android';

// The stock Compose DropdownMenu inside its caller's Host, with the caller's rows.
export function MenuDropdown(props: MenuDropdownProps): ReactElement {
  return (
    <MenuDropdownShell
      trigger={props.trigger}
      items={(close) => (
        <MenuDropdownItems items={props.items} onChosen={close} />
      )}
    />
  );
}
