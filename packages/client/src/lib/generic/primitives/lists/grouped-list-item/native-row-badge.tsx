import type { GroupedListItemProps } from './grouped-list-item-props';

// iOS hands the count to SwiftUI's own `.badge()` on the Form row (see rowModifiers), so the row draws nothing here.
export function NativeRowBadge(
  _props: Pick<GroupedListItemProps, 'badge' | 'badgeLabel'>,
): null {
  return null;
}
