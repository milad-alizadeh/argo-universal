import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { GroupedList } from '#primitives/lists/grouped-list';

// SwiftUI's grouped Form scrolls the rows itself, filling the height the sheet's detent gives it.
export function ElicitationList({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const list = <GroupedList fit>{children}</GroupedList>;

  if (useWide()) return list;

  return <View className="flex-1">{list}</View>;
}
