import { ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  disabled,
  foregroundStyle,
  frame,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import { iconPixels } from '../../../symbols/icon';
import { type ListItemProps, listItemName } from '../../fields/field-props';
import { useSwiftUITextModifiers } from '../../native/native-typography';
import { subtitleRole, titleRole, useToneColor } from './list-item-text';
import { NativeRowGlyph } from './native-row';

// A row's side inset, and the space between its leading slot, label and trailing items.
export const inset = 16;
export const rowSpacing = 12;

type RowModifiers = NonNullable<
  React.ComponentProps<typeof VStack>['modifiers']
>;

// The row reads as one element, named by its title and detail.
export const rowAccessibility = (props: ListItemProps): RowModifiers => [
  accessibilityElement('ignore'),
  accessibilityLabel(listItemName(props)),
  disabled(!!props.disabled),
];

// The SwiftUI row's icon or image, or the system spinner in the icon's slot while the row loads.
export function RowLeading(
  props: Pick<ListItemProps, 'icon' | 'loading' | 'leading'>,
): React.JSX.Element | null {
  if (props.loading)
    return <ProgressView modifiers={[frame({ width: iconPixels('lg') })]} />;
  return <NativeRowGlyph {...props} />;
}

// The title, and under it a one-line subtitle such as an Agent's description; code draws in the mono face.
export function RowLabel(props: ListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers(titleRole(props.code), 'row');
  const secondaryModifiers = useSwiftUITextModifiers(
    subtitleRole(props.subtitle),
  );
  const color = useTitleColor(props.tone);
  const muted = useRowColor('secondary');
  const title = (
    <Text modifiers={[...bodyModifiers, color, lineLimit(1)]}>
      {props.title}
    </Text>
  );
  // The label takes the row's spare width, so the value and status trail it on the same line.
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      {title}
      {props.subtitle && (
        <Text modifiers={[...secondaryModifiers, muted, lineLimit(1)]}>
          {props.subtitle.text}
        </Text>
      )}
    </VStack>
  );
}

function useTitleColor(
  tone: ListItemProps['tone'],
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
