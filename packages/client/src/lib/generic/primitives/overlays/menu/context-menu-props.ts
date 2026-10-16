import type { ReactElement } from 'react';
import type { IconName } from '../../../symbols/icon-names';

// One action in a context menu: its icon leads the label; choosing it runs it and closes the menu.
export interface ContextMenuItem {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}

// The menu a right-click opens on an element, such as a Session row's Rename and Archive.
export interface ContextMenuProps {
  // Runs of actions. The web draws them as one list; a phone's system menu may part them.
  groups: readonly (readonly ContextMenuItem[])[];
  // A double-click on the element runs its main edit, such as renaming a row; phones have none.
  onDoubleClick?: () => void;
  // The element the menu opens on, at the pointer.
  children: ReactElement;
}
