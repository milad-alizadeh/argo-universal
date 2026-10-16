import type * as React from 'react';
import {
  NativeText,
  type NativeTextProps,
} from '#primitives/display/native-text';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { codeTruncation, subtitleModifiers } from './grouped-list-item-text';

type Subtitle = NonNullable<ResolvedItemProps['subtitle']>;

// Prose reflows under the title, such as an Agent's setup explanation; code, such as a path, keeps one line and shortens before the row's trailing accessory.
export function RowSubtitle({
  subtitle,
}: Pick<ResolvedItemProps, 'subtitle'>): React.JSX.Element | null {
  return subtitle ? (
    <NativeText
      role="secondary"
      tone="muted"
      code={subtitle.code}
      {...lineProps(subtitle)}
    >
      {subtitle.text}
    </NativeText>
  ) : null;
}

function lineProps(
  subtitle: Subtitle,
): Pick<NativeTextProps, 'numberOfLines' | 'modifiers'> {
  if (!subtitle.code)
    return {
      numberOfLines: subtitle.numberOfLines,
      modifiers: subtitleModifiers,
    };

  return {
    numberOfLines: subtitle.numberOfLines ?? 1,
    modifiers: [...subtitleModifiers, ...codeTruncation],
  };
}
