import { Button, HStack, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  disabled,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSeparatorTint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { useNavigationFields } from '../../fields/field-layout';
import { rowAccessibilityModifiers } from './list-item-accessibility';
import type { ListItemProps } from './list-item-props';
import { RowContent } from './list-item-row.ios';
import { ListItem as WebListItem } from './list-item.tsx';
import { NativeRowDetail } from './native-row-detail.ios';

const inset = 16;

// SwiftUI caches separator tint on the row; replace it when Appearance changes.
export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  const navigation = useNavigationFields();

  if (wide) return <WebListItem {...props} />;
  const modifiers = rowModifiers(props, colors, navigation);

  return (
    <NativeRow key={colors.separator} item={props} modifiers={modifiers} />
  );
}

interface NativeRowProps {
  item: ListItemProps;
  modifiers: RowModifiers;
}

function NativeRow({ item, modifiers }: NativeRowProps): React.JSX.Element {
  const content = <RowStack {...item} />;

  if (!item.onPress) return <HStack modifiers={modifiers}>{content}</HStack>;

  return (
    <PressableRow
      press={item.onPress}
      modifiers={modifiers}
      content={content}
    />
  );
}

function RowStack(props: ListItemProps): React.JSX.Element {
  return (
    <VStack spacing={0}>
      <RowContent {...props} />
      <NativeRowDetail detail={props.detail} />
    </VStack>
  );
}

interface PressableRowProps {
  press: () => void;
  modifiers: RowModifiers;
  content: React.ReactElement;
}

function PressableRow({
  press,
  modifiers,
  content,
}: PressableRowProps): React.JSX.Element {
  return (
    <Button onPress={press} modifiers={pressModifiers(modifiers)}>
      {content}
    </Button>
  );
}

function pressModifiers(modifiers: RowModifiers): RowModifiers {
  return [
    buttonStyle('automatic'),
    ...modifiers,
    accessibilityAddTraits(['isButton']),
  ];
}

type RowColors = Pick<NativeColors, 'separator'>;

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
    ...rowAccessibilityModifiers(props),
    disabled(!!props.disabled),
  ];
}

// A navigation row sits flat on the screen, like the sidebar's; a grouped row keeps the system cell, which draws the press highlight.
function rowSurface(
  { separator }: RowColors,
  navigation: boolean,
): RowModifiers {
  if (navigation)
    return [listRowBackground('transparent'), listRowSeparator('hidden')];

  return [listRowSeparatorTint(separator)];
}
