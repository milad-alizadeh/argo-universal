import type * as React from 'react';
import { ListItem } from '#primitives/lists/list-item/list-item-view';

// Asks the Server to check the Agent once more; drawn disabled while the page cannot.
export function CheckAgainRow({
  onPress,
}: {
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <ListItem
      icon="retry"
      tone="accent"
      title="Check again"
      onPress={onPress}
      disabled={!onPress}
    />
  );
}
