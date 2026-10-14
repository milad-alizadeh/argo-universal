import { VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { NativeControl } from '#primitives/native/native-control';
import type { GroupedListItemProps } from './grouped-list-item-props';

const detailBottom = 12;

// The row's detail control under it, in the SwiftUI row.
export function NativeRowDetail({
  detail,
}: Pick<GroupedListItemProps, 'detail'>): React.JSX.Element | null {
  if (!detail) return null;

  return (
    <VStack modifiers={[padding({ bottom: detailBottom })]}>
      <NativeControl>{detail}</NativeControl>
    </VStack>
  );
}
