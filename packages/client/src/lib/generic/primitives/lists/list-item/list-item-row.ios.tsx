import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  alignmentGuide,
  fixedSize,
  frame,
  opacity,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useIconPixels } from '../../../symbols/icon-role';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { ListItemProps } from '../../fields/field-props';
import { useSwiftUITextModifiers } from '../../native/native-typography';
import { hasDisclosure, hasLeadingSlot } from './list-item-styles';
import { RowLabel, RowLeading, useRowColor } from './list-item-swift-ui';
import { NativeRowImage, NativeRowStatus } from './native-row';
const rowHeight = 44;
const rowSpacing = 12;
const disabledOpacity = 0.5;
const reflowFontScale = 1.5;
const reflowSpacing = 8;
export function RowContent(props: ListItemProps): React.JSX.Element {
  const iconSize = useIconPixels('row');
  return (
    <HStack
      spacing={rowSpacing}
      modifiers={[
        padding({ vertical: 12 }),
        accessibilityHidden(!!props.detail),
        frame({ minHeight: rowHeight }),
        rowOpacity(props.disabled),
        alignmentGuide(
          'listRowSeparatorLeading',
          hasLeadingSlot(props) ? iconSize + rowSpacing : 0,
        ),
      ]}
    >
      <RowLeading {...props} />
      <RowFields {...props} />
      <DisclosureIndicator visible={hasDisclosure(props)} />
    </HStack>
  );
}

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const color = useRowColor('secondary');
  return (
    <HStack
      spacing={8}
      modifiers={[fixedSize({ horizontal: false, vertical: true })]}
    >
      {props.valueLeading && <NativeRowImage image={props.valueLeading} />}
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
    <NativeSymbol name="chevron-right" role="body" muted />
  ) : null;
}

function rowOpacity(disabled: boolean | undefined): ReturnType<typeof opacity> {
  return opacity(disabled ? disabledOpacity : 1);
}

function RowFields(props: ListItemProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  const fields = (
    <>
      <RowLabel {...props} />
      <RowTrailing {...props} />
    </>
  );
  if (fontScale < reflowFontScale || props.value === undefined) return fields;
  return (
    <VStack
      alignment="leading"
      spacing={reflowSpacing}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      {fields}
    </VStack>
  );
}
