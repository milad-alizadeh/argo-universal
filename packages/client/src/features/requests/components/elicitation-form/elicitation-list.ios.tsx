import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';

type ListProps = { children: ReactNode };

/*
 * A phone's sheet fills with SwiftUI's grouped Form, which scrolls the rows at the height the sheet's
 * detent gives it; the wide Composer's tray and a Feed card fit the rows instead.
 */
export function ElicitationList({ children }: ListProps): ReactElement {
  return (
    <SizeClass
      compact={<FilledList>{children}</FilledList>}
      wide={<GroupedList fit>{children}</GroupedList>}
    />
  );
}

function FilledList({ children }: ListProps): ReactElement {
  return (
    <View className="flex-1">
      <GroupedList>{children}</GroupedList>
    </View>
  );
}
