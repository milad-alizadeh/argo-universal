// Split from Android: the universal ListItem lays its leading slot out in a plain stack, so only SwiftUI's Label lines a Form row's titles up the stock way.
import { Label } from '@expo/ui/swift-ui';
import { accessibilityHidden, frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { hasLeadingSlot } from './grouped-list-item-styles';
import { RowTitles } from './grouped-list-item-titles';
import { NativeRowLeading } from './native-row';

/*
 * The row's icon and titles as one Label: the List sizes the icon to the title's text style, starts
 * every title at one edge whatever each glyph's width, and starts the separator under the title.
 */
export function RowHeadline(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Label
      icon={hasLeadingSlot(props) ? <NativeRowLeading {...props} /> : undefined}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: 'leading' }),
        accessibilityHidden(!!props.control),
      ]}
    >
      <RowTitles {...props} />
    </Label>
  );
}
