import type * as React from 'react';
import { NativeText } from '#primitives/display/native-text';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { codeTruncation, subtitleModifiers } from './grouped-list-item-text';

// Prose reflows under the title, such as an Agent's setup explanation; code, such as a path, keeps one line and shortens before the row's trailing accessory.
export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  return subtitle ? (
    <NativeText
      role="secondary"
      tone="muted"
      code={subtitle.code}
      numberOfLines={subtitle.numberOfLines ?? (subtitle.code ? 1 : undefined)}
      modifiers={
        subtitle.code
          ? [...subtitleModifiers, ...codeTruncation]
          : subtitleModifiers
      }
    >
      {subtitle.text}
    </NativeText>
  ) : null;
}
