import { Button, HStack, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityAddTraits,
  alignmentGuide,
  accessibilityLabel,
  buttonStyle,
  disabled,
  fixedSize,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSeparatorTint,
  opacity,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '../../../native-theme';
import { useIconPixels } from '../../../symbols/icon-role';
import { SwiftUISymbol } from '../../../symbols/swift-ui-symbol';
import { useWide } from '../../../use-wide/use-wide';
import { useNavigationFields } from '../../fields/field-layout';
import { type ListItemProps, listItemName } from '../../fields/field-props';
import { useSwiftUITextModifiers } from '../../native/native-typography';
import { hasDisclosure, hasLeadingSlot } from './list-item-styles';
import { RowLabel, RowLeading, useRowColor } from './list-item-swift-ui';
import { ListItem as WebListItem } from './list-item-view.tsx';
import { NativeRowStatus } from './native-row';

const rowHeight = 52;
const inset = 16;

const rowSpacing = 12;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  const navigation = useNavigationFields();
  if (wide) return <WebListItem {...props} />;
  const modifiers = rowModifiers(props, colors, navigation);
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

type RowColors = Pick<NativeColors, 'muted' | 'separator'>;
type RowModifiers = NonNullable<
  React.ComponentProps<typeof HStack>['modifiers']
>;

function rowModifiers(
  props: ListItemProps,
  colors: RowColors,
  navigation: boolean,
): RowModifiers {
  return [
    ...rowSurface(colors, navigation),
    listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
    accessibilityElement('ignore'),
    accessibilityLabel(listItemName(props)),
    disabled(!!props.disabled),
  ];
}

// A navigation row sits flat on the screen, without the card or its separators, like the sidebar's.
function rowSurface(
  { muted, separator }: RowColors,
  navigation: boolean,
): RowModifiers {
  if (navigation)
    return [listRowBackground('transparent'), listRowSeparator('hidden')];
  return [
    listRowBackground(muted ?? 'transparent'),
    listRowSeparatorTint(separator),
  ];
}

function RowContent(props: ListItemProps): React.JSX.Element {
  const iconPixels = useIconPixels('row');
  return (
    <HStack
      spacing={rowSpacing}
      modifiers={[
        padding({ vertical: 12 }),
        frame({ minHeight: rowHeight }),
        rowOpacity(props.disabled),
        alignmentGuide(
          'listRowSeparatorLeading',
          hasLeadingSlot(props) ? iconPixels + rowSpacing : 0,
        ),
      ]}
    >
      <RowLeading {...props} />
      <RowLabel {...props} />
      <RowTrailing {...props} />
      <DisclosureIndicator visible={hasDisclosure(props)} />
    </HStack>
  );
}

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const color = useRowColor('secondary');
  return (
    <HStack spacing={8} modifiers={[fixedSize({ horizontal: true })]}>
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
    <SwiftUISymbol
      name="chevron-right"
      role="body"
      modifiers={[foregroundStyle({ type: 'hierarchical', style: 'tertiary' })]}
    />
  ) : null;
}

function rowOpacity(disabled: boolean | undefined): ReturnType<typeof opacity> {
  return opacity(disabled ? disabledOpacity : 1);
}
