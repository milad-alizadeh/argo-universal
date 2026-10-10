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
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { type ListItemProps, listItemName } from './field-props';
import { ListItem as WebListItem } from './list-item-view.tsx';
import { NativeRowIcon, NativeRowStatus } from './native-row';

const rowHeight = 52;
const inset = 16;
const chevronSize = 12;
const iconSeparatorInset = 28;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const modifiers = useRowModifiers(props);
  if (wide) return <WebListItem {...props} />;
  return (
    <Button onPress={props.onPress} modifiers={modifiers}>
      <RowContent {...props} />
    </Button>
  );
}

function useRowModifiers(
  props: ListItemProps,
): React.ComponentProps<typeof Button>['modifiers'] {
  const { muted, separator } = useNativeTheme().colors;
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
  return (
    <HStack
      spacing={12}
      modifiers={[
        padding({ vertical: 12 }),
        frame({ minHeight: rowHeight }),
        rowOpacity(props.disabled),
        alignmentGuide(
          'listRowSeparatorLeading',
          props.icon ? iconSeparatorInset : 0,
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
          size={chevronSize}
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
