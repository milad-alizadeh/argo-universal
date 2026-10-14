import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { NativeControl } from '#primitives/native/native-control';
import type { GroupedListItemProps } from './grouped-list-item-props';

const detailGutter = 16;

const detailBottom = 12;

function detailModifiers(): ReturnType<typeof fillMaxWidth>[] {
  return [fillMaxWidth(), padding(detailGutter, 0, detailGutter, detailBottom)];
}

// The row's detail control under it, in the Compose row.
export function NativeRowDetail({
  detail,
}: Pick<GroupedListItemProps, 'detail'>): React.JSX.Element | null {
  if (!detail) return null;

  return (
    <Column modifiers={detailModifiers()}>
      <NativeControl>{detail}</NativeControl>
    </Column>
  );
}
