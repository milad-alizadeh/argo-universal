import type { SessionMenu } from './session-menu-items';

export interface SessionMenuToolbarProps {
  menu: SessionMenu;
}

// The web's narrow header takes the Session's ⋯ as a header item; only the native stack headers take stock items.
export function SessionMenuToolbar(_props: SessionMenuToolbarProps): null {
  return null;
}
