import { DropdownMenu } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { MenuDropdownItems } from './menu-dropdown-items';
import type { MenuDropdownProps } from './menu-dropdown-props';
import { useDropdownState } from './use-dropdown-state.android';

/*
 * The stock Compose DropdownMenu every Android menu opens, inside its caller's Host. It is controlled: `expanded`
 * shows it, `onDismissRequest` closes it on an outside tap or back.
 */
export function MenuDropdown(props: MenuDropdownProps): ReactElement {
  const { expanded, open, close, color } = useDropdownState();

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close} color={color}>
      <DropdownMenu.Trigger>{props.trigger(open)}</DropdownMenu.Trigger>
      <MenuDropdownItems items={props.items} onChosen={close} />
    </DropdownMenu>
  );
}
