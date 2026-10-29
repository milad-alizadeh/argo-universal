import type { Href } from 'expo-router';
import type { ReactElement } from 'react';
import type { AccessibilityState, Role } from 'react-native';
import type { ActionShortcut } from '#primitives/content/kbd';
import type { IconSymbol } from '../../../symbols/icon-symbol';

// One action in a context menu: its icon leads the label; choosing it runs it and closes the menu.
export interface ContextMenuItem {
  label: string;
  id?: string;
  icon?: IconSymbol;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'danger';
  shortcut?: ActionShortcut;
}

// How a screen reader reads the element: its name, role, hint and state, such as a selected Session row.
export interface SpokenElement {
  label?: string;
  role?: Role;
  hint?: string;
  state?: AccessibilityState;
}

// Optional long-press handling retained for pressable trigger callers.
export interface ContextMenuTriggerProps {
  onLongPress?: () => void;
}

// The menu a right-click, or a phone's long press, opens on an element, such as a Session row's Rename and Archive.
export interface ContextMenuProps {
  // Runs of actions. The web draws them as one list; a phone's system menu parts them.
  groups: readonly (readonly ContextMenuItem[])[];
  // iOS heads the menu with it, such as the Session's title; Android and the web draw no title.
  title?: string;
  groupTitles?: readonly (string | undefined)[];
  // iOS draws this page above the menu as the element's preview, and a tap on it opens the page; without one the element itself lifts.
  preview?: Href;
  // How the element reads. iOS reads it for an element with a `preview`, whose trigger hides the element's own accessibility.
  spoken?: SpokenElement;
  // A double-click on the element runs its main edit, such as renaming a row; phones have none.
  onDoubleClick?: () => void;
  // The element the menu opens on, at the pointer.
  children: ReactElement<ContextMenuTriggerProps>;
}
