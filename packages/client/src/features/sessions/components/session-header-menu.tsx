import type * as React from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { type SessionMenu, sessionMenuItems } from './session-menu-items';

// The header's icon buttons: ghost, extra small and tight-cornered, with 16px foreground icons.
export const headerActionAppearance = {
  variant: 'ghost',
  size: 'xs',
  corners: 'tight',
  iconRole: 'control',
  iconClassName: 'text-foreground',
} as const;

const sessionMenuLabel = 'More';

// ⋯ lines the menu up with its right edge.
const sessionMenuParts = {
  accessibilityLabel: sessionMenuLabel,
  align: 'end',
  trigger: (
    <IconButton
      {...headerActionAppearance}
      accessibilityLabel={sessionMenuLabel}
      icon="more"
    />
  ),
} as const;

// ⋯ opens the Session's Rename and Archive under it; with neither to offer, it is not drawn.
export function SessionHeaderMenu({
  menu,
}: {
  menu: SessionMenu;
}): React.JSX.Element | null {
  const actions = sessionMenuItems(menu);

  if (actions.length === 0) return null;

  return <Menu {...sessionMenuParts} actions={actions} />;
}
