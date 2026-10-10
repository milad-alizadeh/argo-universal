import { Button, HStack, Image, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityAddTraits,
  alignmentGuide,
  accessibilityLabel,
  buttonStyle,
  disabled,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparatorTint,
  opacity,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '../native-theme';
import { iconPixels } from '../symbols/icon';
import { useWide } from '../use-wide';
import { type ListItemProps, listItemName } from './field-props';
import { ListItem as WebListItem } from './list-item-view.tsx';
import { NativeRowIcon, NativeRowStatus } from './native-row';

const rowHeight = 52;
const inset = 16;

const rowSpacing = 12;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  if (wide) return <WebListItem {...props} />;
  // SwiftUI caches separator tint on the row; replace it when Appearance changes.
  return (
    <Button
      key={colors.separator}
      onPress={props.onPress}
      modifiers={rowModifiers(props, colors)}
    >
      <RowContent {...props} />
    </Button>
  );
}

function rowModifiers(
  props: ListItemProps,
  { muted, separator }: Pick<NativeColors, 'muted' | 'separator'>,
): React.ComponentProps<typeof Button>['modifiers'] {
  return [
    buttonStyle('automatic'),
    listRowBackground(muted ?? 'transparent'),
    listRowSeparatorTint(separator),
    listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
    accessibilityElement('ignore'),
    accessibilityLabel(listItemName(props)),
    accessibilityAddTraits(props.onPress ? ['isButton'] : []),
    disabled(!!props.disabled),
  ];
}

function RowContent(props: ListItemProps): React.JSX.Element {
  const color = useRowColor('primary');
  const iconSize = iconPixels('lg');
  return (
    <HStack
      spacing={rowSpacing}
      modifiers={[
        padding({ vertical: 12 }),
        frame({ minHeight: rowHeight }),
        rowOpacity(props.disabled),
        alignmentGuide(
          'listRowSeparatorLeading',
          props.icon ? iconSize + rowSpacing : 0,
        ),
      ]}
    >
      {props.icon && <NativeRowIcon icon={props.icon} />}
      <Text modifiers={[font({ textStyle: 'body' }), color]}>
        {props.title}
      </Text>
      <Spacer />
      <RowTrailing {...props} />
    </HStack>
  );
}

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const color = useRowColor('secondary');
  return (
    <HStack spacing={8}>
      {props.value !== undefined && (
        <Text modifiers={[font({ textStyle: 'body' }), color]}>
          {props.value}
        </Text>
      )}
      <NativeRowStatus {...props} />
      {props.onPress && (
        <Image
          systemName="chevron.right"
          size={iconPixels('xs')}
          modifiers={[
            foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
          ]}
        />
      )}
    </HStack>
  );
}

function useRowColor(
  role: 'primary' | 'secondary',
): ReturnType<typeof foregroundStyle> {
  const { foreground, mutedForeground } = useNativeTheme().colors;
  const color = role === 'primary' ? foreground : mutedForeground;
  return foregroundStyle(color ?? { type: 'hierarchical', style: role });
}

function rowOpacity(disabled: boolean | undefined): ReturnType<typeof opacity> {
  return opacity(disabled ? disabledOpacity : 1);
}
