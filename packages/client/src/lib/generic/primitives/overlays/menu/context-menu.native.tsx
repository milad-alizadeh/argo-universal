import type { ReactElement } from 'react';
import type { ContextMenuProps } from './context-menu-props';

// Phones open their menus on a long press with the system's own context menu, which a later change draws; until then the element stands alone.
export function ContextMenu(props: ContextMenuProps): ReactElement {
  return props.children;
}
