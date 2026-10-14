import type * as React from 'react';
import {
  GroupedListItemCorners,
  GroupedListItemEnd,
  GroupedListItemHover,
} from '#primitives/lists/grouped-list-item';
import type { FieldListEntry } from './field-list-entries';
import { type HoverStore, useRowHover } from './field-row-hover-store';

type RowEntry = Extract<FieldListEntry, { kind: 'row' }>;

interface CardRowProps {
  entry: RowEntry;
  index: number;
  store: HoverStore;
}

// One row of the section's card: the first rounds its top, the last its bottom and drops its separator.
export function CardRow({
  entry,
  index,
  store,
}: CardRowProps): React.JSX.Element {
  const hover = useRowHover(store, index);

  return (
    <GroupedListItemHover value={hover}>
      <GroupedListItemCorners value={{ first: entry.first, last: entry.last }}>
        <GroupedListItemEnd value={entry.last}>{entry.row}</GroupedListItemEnd>
      </GroupedListItemCorners>
    </GroupedListItemHover>
  );
}
