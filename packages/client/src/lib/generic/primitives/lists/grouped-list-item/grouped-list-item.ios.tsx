import { Button, HStack, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  badge,
  buttonStyle,
  disabled,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSeparatorTint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { badgeCountText } from '#primitives/display/badge';
import { useSidebarList } from '#primitives/fields/field-layout';
import { type NativeColors, useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { rowAccessibilityModifiers } from './grouped-list-item-accessibility';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowContent } from './grouped-list-item-row.ios';
import { GroupedListItem as WebGroupedListItem } from './grouped-list-item.tsx';
import { NativeRowDetail } from './native-row-detail.ios';

const inset = 16;

// SwiftUI caches separator tint on the row; replace it when Appearance changes.
export function GroupedListItem(
  props: GroupedListItemProps,
): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  const sidebar = useSidebarList();

  if (wide) return <WebGroupedListItem {...props} />;
  const modifiers = rowModifiers(props, colors, sidebar);

  return <NativeRow key={colors.border} item={props} modifiers={modifiers} />;
}

interface NativeRowProps {
  item: GroupedListItemProps;
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

function RowStack(props: GroupedListItemProps): React.JSX.Element {
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

type RowColors = Pick<NativeColors, 'border'>;

type RowModifiers = NonNullable<
  React.ComponentProps<typeof HStack>['modifiers']
>;

function rowModifiers(
  props: GroupedListItemProps,
  colors: RowColors,
  sidebar: boolean,
): RowModifiers {
  return [
    ...rowSurface(colors, sidebar),
    listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
    ...rowAccessibilityModifiers(props),
    disabled(!!props.disabled),
    badge(badgeCountText(props.badge)),
  ];
}

// A sidebar row sits flat on the screen; a grouped row keeps the system cell, which draws the press highlight.
function rowSurface({ border }: RowColors, sidebar: boolean): RowModifiers {
  if (sidebar)
    return [listRowBackground('transparent'), listRowSeparator('hidden')];

  return [listRowSeparatorTint(border)];
}

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
