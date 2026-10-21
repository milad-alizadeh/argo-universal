import { DropdownMenu } from '@expo/ui/jetpack-compose';
import { useState, type ReactElement } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';

interface MenuDropdownShellProps {
  trigger: (open: () => void) => ReactElement;
  items: (close: () => void) => ReactElement;
}

/*
 * The stock Compose DropdownMenu every Android menu and submenu opens. It is controlled: `expanded` shows it,
 * `onDismissRequest` closes it on an outside tap or back.
 */
export function MenuDropdownShell(props: MenuDropdownShellProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const close = (): void => setExpanded(false);
  const color = useMaterialPalette().roles.surfaceContainer;

  return (
    <DropdownMenu expanded={expanded} onDismissRequest={close} color={color}>
      <DropdownMenu.Trigger>
        {props.trigger(() => setExpanded(true))}
      </DropdownMenu.Trigger>
      {props.items(close)}
    </DropdownMenu>
  );
}
