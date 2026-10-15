import type * as React from 'react';
import { NativeText } from '#primitives/native/native-text';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { subtitleModifiers } from './grouped-list-item-text';

// The subtitle reflows under the title, such as an Agent's setup explanation.
export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  return subtitle ? (
    <NativeText
      role="secondary"
      code={subtitle.code}
      numberOfLines={subtitle.numberOfLines}
      modifiers={subtitleModifiers}
    >
      {subtitle.text}
    </NativeText>
  ) : null;
}
