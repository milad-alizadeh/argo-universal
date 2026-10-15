import { ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import {
  foregroundStyle,
  frame,
  accessibilityHidden,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useSwiftUITextModifiers } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useIconPixels } from '../../../symbols/icon-role';
import type { GroupedListItemProps } from './grouped-list-item-props';
import {
  subtitleRole,
  titleRole,
  useToneColor,
} from './grouped-list-item-text';
import { NativeRowGlyph } from './native-row';

// The SwiftUI row's icon or image, or the system spinner in the icon's slot while the row loads.
export function RowLeading(
  props: Pick<GroupedListItemProps, 'icon' | 'loading' | 'leading'>,
): React.JSX.Element | null {
  const width = useIconPixels('row');

  if (props.loading) return <ProgressView modifiers={[frame({ width })]} />;

  return <NativeRowGlyph {...props} />;
}

// The title and subtitle reflow at the system text size; code draws in the mono face.
export function RowLabel(props: GroupedListItemProps): React.JSX.Element {
  // The label takes the row's spare width, so the value and status trail it on the same line.
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: 'leading' }),
        accessibilityHidden(!!props.control),
      ]}
    >
      <RowTitleText {...props} />
      {props.subtitle && <RowSubtitleText subtitle={props.subtitle} />}
    </VStack>
  );
}

function RowTitleText(props: GroupedListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers(titleRole(props.code), 'row');
  const color = useTitleColor(props.tone);

  return <Text modifiers={[...bodyModifiers, color]}>{props.label}</Text>;
}

function RowSubtitleText({
  subtitle,
}: Required<Pick<GroupedListItemProps, 'subtitle'>>): React.JSX.Element {
  const secondaryModifiers = useSwiftUITextModifiers(subtitleRole(subtitle));
  const muted = useRowColor('secondary');

  const lines = subtitle.numberOfLines
    ? [lineLimit(subtitle.numberOfLines)]
    : [];

  return (
    <Text modifiers={[...secondaryModifiers, muted, ...lines]}>
      {subtitle.text}
    </Text>
  );
}

function useTitleColor(
  tone: GroupedListItemProps['tone'],
): ReturnType<typeof foregroundStyle> {
  const primary = useRowColor('primary');
  const toned = useToneColor(tone);

  return toned ? foregroundStyle(toned) : primary;
}

export function useRowColor(
  role: 'primary' | 'secondary',
): ReturnType<typeof foregroundStyle> {
  const { foreground, mutedForeground } = useNativeTheme().colors;
  const color = role === 'primary' ? foreground : mutedForeground;

  return foregroundStyle(color ?? { type: 'hierarchical', style: role });
}
