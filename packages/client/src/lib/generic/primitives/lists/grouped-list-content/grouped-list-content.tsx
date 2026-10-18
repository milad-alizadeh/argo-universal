import type * as React from 'react';
import { View } from 'react-native';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { GroupedListContentProps } from './grouped-list-content-props';

// Content in a GroupedList outside any section's card, such as an alert or a form's actions.
export function GroupedListContent({
  children,
  title,
}: GroupedListContentProps): React.JSX.Element {
  const content = <View>{children}</View>;

  return title ? (
    <GroupedListSection title={title} cardless>
      {content}
    </GroupedListSection>
  ) : (
    content
  );
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
