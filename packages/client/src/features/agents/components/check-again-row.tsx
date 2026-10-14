import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';

// Asks the Server to check the Agent once more; drawn disabled while the page cannot.
export function CheckAgainRow({
  onPress,
}: {
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <GroupedListItem
      icon="retry"
      tone="accent"
      title="Check again"
      onPress={onPress}
      disabled={!onPress}
    />
  );
}
