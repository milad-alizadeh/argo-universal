import type { ReactElement } from 'react';
import { Menu } from '#primitives/overlays/menu';
import { IconButton } from './icon-button';
import type { IconButtonMenuProps } from './icon-button-menu-props';

// The web's drawing: the Menu primitive opened from an IconButton. iOS and Android draw their system menus (ADR-0020).
export function IconButtonMenu({
  actions,
  ...button
}: IconButtonMenuProps): ReactElement {
  return (
    <Menu
      accessibilityLabel={button.accessibilityLabel}
      align="start"
      disabled={button.disabled ?? false}
      actions={actions}
      trigger={<IconButton {...button} />}
    />
  );
}
