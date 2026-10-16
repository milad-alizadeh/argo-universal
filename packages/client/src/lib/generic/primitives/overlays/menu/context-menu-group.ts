import type { ContextMenuItem } from './context-menu-props';

// A group of one action, or none when the element offers no handler for it.
export function contextMenuGroup(
  label: string,
  icon: ContextMenuItem['icon'],
  onPress: (() => void) | undefined,
): ContextMenuItem[] {
  return onPress ? [{ label, icon, onPress }] : [];
}
