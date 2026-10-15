import { accessibilityHidden } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { badgeCountText } from '#lib/generic/badge-count';
import { NativeText } from '#primitives/display/native-text';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { rowColor } from './grouped-list-item-text';

// SwiftUI's `.badge()` lands after this row's hand-drawn chevron, so the count is drawn as `.badge()` draws it in a List: secondary text, read with the row's name.
export function NativeRowBadge(
  props: Pick<GroupedListItemProps, 'badge' | 'badgeLabel'>,
): React.JSX.Element | null {
  const text = badgeCountText(props.badge);

  if (text === undefined) return null;

  return (
    <NativeText
      tone="muted"
      modifiers={[...rowColor('secondary'), accessibilityHidden()]}
    >
      {text}
    </NativeText>
  );
}
