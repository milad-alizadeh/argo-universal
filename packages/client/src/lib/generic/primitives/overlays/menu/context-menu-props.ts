import type { Href } from 'expo-router';
import type { ReactElement } from 'react';
import type { IconName } from '../../../symbols/icon-names';

// One action in a context menu: its icon leads the label; choosing it runs it and closes the menu.
export interface ContextMenuItem {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}

// What the menu passes the element it opens on: Android opens on the element's own long press, so the element hands it to its press.
export interface ContextMenuTriggerProps {
  onLongPress?: () => void;
}

// The menu a right-click, or a phone's long press, opens on an element, such as a Session row's Rename and Archive.
export interface ContextMenuProps {
  // Runs of actions. The web draws them as one list; a phone's system menu parts them.
  groups: readonly (readonly ContextMenuItem[])[];
  // iOS heads the menu with it, such as the Session's title; Android and the web draw no title.
  title?: string;
  // iOS draws this page above the menu as the element's preview, and a tap on it opens the page; without one the element itself lifts.
  preview?: Href;
  // A double-click on the element runs its main edit, such as renaming a row; phones have none.
  onDoubleClick?: () => void;
  // The element the menu opens on, at the pointer.
  children: ReactElement<ContextMenuTriggerProps>;
}
