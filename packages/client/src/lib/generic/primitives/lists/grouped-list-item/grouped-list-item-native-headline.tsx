import type * as React from 'react';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowTitles } from './grouped-list-item-titles';
import { NativeRowLeading } from './native-row';

// Material's leading slot: the icon in its fixed 24 box, so every title starts at one edge.
export function RowHeadline(props: GroupedListItemProps): React.JSX.Element {
  return (
    <>
      <NativeRowLeading {...props} />
      <RowTitles {...props} />
    </>
  );
}
