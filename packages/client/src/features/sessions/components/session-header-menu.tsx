import {
  headerMenuActions,
  useDeclaredActions,
} from '@repo/kit/primitives/actions/action';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Menu } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { type SessionMenu, sessionActions } from './session-actions';

// The header's icon buttons: ghost, extra small and tight-cornered, with 16px foreground icons.
export const headerActionAppearance = {
  variant: 'ghost',
  size: 'md',
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

// The window band reserves its control box even when the Session has no actions.
export function SessionHeaderMenu({
  menu,
  reserved = false,
}: {
  menu: SessionMenu;
  reserved?: boolean;
}): React.JSX.Element | null {
  const actions = sessionActions(menu);

  if (actions.length === 0) return emptyMenu(reserved);

  return <SessionActionsMenu actions={actions} />;
}

// The window band's ⋯ draws the same declared Actions as a phone's header and a row's context menu.
function SessionActionsMenu({
  actions,
}: {
  actions: React.ReactElement[];
}): React.JSX.Element {
  const { groups } = useDeclaredActions(actions);

  return <Menu {...sessionMenuParts} actions={headerMenuActions(groups)} />;
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

function emptyMenu(reserved: boolean): React.JSX.Element | null {
  return reserved ? <EmptySessionMenu /> : null;
}
