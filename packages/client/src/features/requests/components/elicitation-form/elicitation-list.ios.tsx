import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';

// SwiftUI's grouped Form scrolls the rows itself, filling the height the sheet's detent gives it.
export function ElicitationList({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const list = <GroupedList fit>{children}</GroupedList>;

  return (
    <SizeClass compact={<View className="flex-1">{list}</View>} wide={list} />
  );
}
