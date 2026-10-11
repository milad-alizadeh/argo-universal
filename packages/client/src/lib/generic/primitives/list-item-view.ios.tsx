import { Button, HStack, Image, LabeledContent, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityAddTraits,
  alignmentGuide,
  accessibilityLabel,
  buttonStyle,
  disabled,
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
import { NativeRowLeading, NativeRowStatus } from './native-row';
import { useSwiftUITextModifiers } from './native-typography';

const rowHeight = 52;
const inset = 16;

const rowSpacing = 12;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  if (wide) return <WebListItem {...props} />;
  const modifiers = rowModifiers(props, colors);
  const content = <RowContent {...props} />;
  if (!props.onPress)
    return (
      <HStack key={colors.separator} modifiers={modifiers}>
        {content}
      </HStack>
    );
  // SwiftUI caches separator tint on the row; replace it when Appearance changes.
  return (
    <Button
      key={colors.separator}
      onPress={props.onPress}
      modifiers={[
        buttonStyle('automatic'),
        ...modifiers,
        accessibilityAddTraits(['isButton']),
      ]}
    >
      {content}
    </Button>
  );
}

function rowModifiers(
  props: ListItemProps,
  { muted, separator }: Pick<NativeColors, 'muted' | 'separator'>,
): NonNullable<React.ComponentProps<typeof HStack>['modifiers']> {
  return [
    listRowBackground(muted ?? 'transparent'),
    listRowSeparatorTint(separator),
    listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
    accessibilityElement('ignore'),
    accessibilityLabel(listItemName(props)),
    disabled(!!props.disabled),
  ];
}

function RowContent(props: ListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const color = useRowColor(props.destructive ? 'destructive' : 'primary');
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
      <NativeRowLeading icon={props.icon} loading={props.loading} />
      <LabeledContent
        label={<Text modifiers={[...bodyModifiers, color]}>{props.title}</Text>}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <RowTrailing {...props} />
      </LabeledContent>
      <DisclosureIndicator visible={!!props.onPress} />
    </HStack>
  );
}

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const color = useRowColor('secondary');
  return (
    <HStack spacing={8}>
      {props.value !== undefined && (
        <Text modifiers={[...bodyModifiers, color]}>{props.value}</Text>
      )}
      <NativeRowStatus {...props} />
    </HStack>
  );
}

function DisclosureIndicator({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <Image
      systemName="chevron.right"
      size={iconPixels('xs')}
      modifiers={[foregroundStyle({ type: 'hierarchical', style: 'tertiary' })]}
    />
  ) : null;
}

function useRowColor(
  role: 'primary' | 'secondary' | 'destructive',
): ReturnType<typeof foregroundStyle> {
  const { foreground, mutedForeground, destructive } = useNativeTheme().colors;
  const colors = {
    primary: foreground,
    secondary: mutedForeground,
    destructive,
  };
  const style = role === 'secondary' ? 'secondary' : 'primary';
  return foregroundStyle(colors[role] ?? { type: 'hierarchical', style });
}

function rowOpacity(disabled: boolean | undefined): ReturnType<typeof opacity> {
  return opacity(disabled ? disabledOpacity : 1);
}
