import type { Href } from 'expo-router';
import type { ReactElement } from 'react';
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
  // The element's name. iOS reads it for an element with a `preview`, whose trigger hides the element's own text from accessibility.
  label?: string;
  // A double-click on the element runs its main edit, such as renaming a row; phones have none.
  onDoubleClick?: () => void;
  // The element the menu opens on, at the pointer.
  children: ReactElement<ContextMenuTriggerProps>;
}
