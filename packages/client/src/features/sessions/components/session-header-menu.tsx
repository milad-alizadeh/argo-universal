import type * as React from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { type SessionMenu, sessionMenuItems } from './session-menu-items';

// The header's icon buttons: ghost, extra small and tight-cornered, with 16px foreground icons.
export const headerActionAppearance = {
  variant: 'ghost',
  size: 'xs',
  corners: 'control',
  iconRole: 'band',
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

// The menu keeps its band control box even when the Session has no actions.
export function SessionHeaderMenu({
  menu,
}: {
  menu: SessionMenu;
}): React.JSX.Element {
  const actions = sessionMenuItems(menu);

  if (actions.length === 0) return <EmptySessionMenu />;

  return <Menu {...sessionMenuParts} actions={actions} />;
}

function EmptySessionMenu(): React.JSX.Element {
  return (
    <IconButton
      {...headerActionAppearance}
      accessibilityLabel={sessionMenuLabel}
      icon="more"
      disabled
    />
  );
}
