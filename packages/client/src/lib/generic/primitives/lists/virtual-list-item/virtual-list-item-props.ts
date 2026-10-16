import type * as React from 'react';

// Where a row sits in its section. Each row of a virtualised list is in a container of its own, so the list tells it.
export type VirtualListPosition = 'only' | 'first' | 'middle' | 'last';

export interface VirtualListItemProps {
  title: string;
  // A 24 slot (20 wide) before the title, such as an Agent's logo.
  leading?: React.ReactNode;
  // Short content at the line's end, such as a count or a time; set its text in the `row-detail` role.
  trailing?: React.ReactNode;
  // On a phone the rows of a section share one grouped card: the position rounds its ends and, on iOS, drops the last separator.
  position?: VirtualListPosition;
  // Wide only; a phone list has no selection.
  selected?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
  testID?: string;
}
