import type { GroupedListItemProps } from './grouped-list-item-props';

// The native rows draw their count per platform; the web row draws RowBadge, so this resolves only for type checks.
export function NativeRowBadge(
  _props: Pick<GroupedListItemProps, 'badge' | 'badgeLabel'>,
): null {
  return null;
}
