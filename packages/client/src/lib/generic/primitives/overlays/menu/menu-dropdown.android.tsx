import { DropdownMenu } from '@expo/ui/jetpack-compose';
import { useState, type ReactElement } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { MenuDropdownItems } from './menu-dropdown-items';
import type { MenuDropdownProps } from './menu-dropdown-props';

/*
 * The stock Compose DropdownMenu every Android menu opens, inside its caller's Host. It is controlled: `expanded`
 * shows it, `onDismissRequest` closes it on an outside tap or back.
 */
export function MenuDropdown(props: MenuDropdownProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const close = (): void => setExpanded(false);
  const color = useMaterialPalette().roles.surfaceContainer;

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close} color={color}>
      <DropdownMenu.Trigger>
        {props.trigger(() => setExpanded(true))}
      </DropdownMenu.Trigger>
      <MenuDropdownItems items={props.items} onChosen={close} />
    </DropdownMenu>
  );
}
