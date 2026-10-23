import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { RowFrame } from '#primitives/fields/field-row';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { isWebGrouped } from '../../../list-grouped';
import { cn } from '../../../utils';

/*
 * A web FieldGroup section is one card (Expo's FieldSection: a hairline border, radius 12, a 1px divider between
 * rows). A virtualised cell draws its piece of it: the rounded top on a section's first row, the rounded bottom on its
 * last, the side borders on all, and a divider under every row but the last. The row's own padding and press tint are
 * the FieldGroup's RowFrame.
 */
const pieces = {
  only: 'rounded-xl border',
  first: 'rounded-t-xl border-x border-t',
  middle: 'border-x',
  last: 'rounded-b-xl border-x border-b',
} satisfies Record<ListPosition, string>;

const dividerAfter = new Set<ListPosition>(['first', 'middle']);

const cellClass = (position: ListPosition): string =>
  cn('overflow-hidden border-hairline bg-card', pieces[position]);

export function GroupedCell(props: {
  position: ListPosition;
  children: ReactNode;
}): ReactElement {
  const divided = dividerAfter.has(props.position);

  return (
    <View className={cellClass(props.position)}>
      <RowFrame flush>{props.children}</RowFrame>
      {divided ? <View role="separator" className="h-px bg-hairline" /> : null}
    </View>
  );
}

// A web grouped List draws each row as a piece of its section's card; the phones draw it later.
export function GroupedCells(props: {
  appearance: ListAppearance;
  position: ListPosition;
  children: ReactNode;
}): ReactNode {
  if (!isWebGrouped(props.appearance)) return props.children;

  return <GroupedCell position={props.position}>{props.children}</GroupedCell>;
}
