import type * as React from 'react';
import { View } from 'react-native';
import type { GroupedListContentProps } from './grouped-list-content-props';

// Content in a GroupedList outside any section's card, such as an alert or a form's actions.
export function GroupedListContent({
  children,
}: GroupedListContentProps): React.JSX.Element {
  return <View>{children}</View>;
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
