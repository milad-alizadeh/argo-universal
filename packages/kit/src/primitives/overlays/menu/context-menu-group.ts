import type { ContextMenuItem } from './context-menu-props';

// A group of one action, or none when the element offers no handler for it.
export function contextMenuGroup(
  item: Omit<ContextMenuItem, 'onPress'>,
  onPress: (() => void) | undefined,
): ContextMenuItem[] {
  return onPress ? [{ ...item, onPress }] : [];
}
