import type * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '#primitives/display/text';
import { usePressRipple } from '#primitives/native/material-palette';
import type {
  VirtualListItemProps,
  VirtualListPosition,
} from './virtual-list-item-props';
import {
  leadingClasses,
  rowClasses,
  separatorClasses,
  surfaceClasses,
  trailingClasses,
} from './virtual-list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

/*
 * A one-line row of a virtualised list. A phone draws it as a row of a grouped list, as the stock
 * lists do, from LegendList's cells, where a native Form or Compose column cannot sit.
 */
export function VirtualListItem(
  props: VirtualListItemProps,
): React.JSX.Element {
  const { position, selected } = itemPlace(props);

  return (
    <View className={surfaceClasses(position, selected)}>
      <Pressable {...usePressProps(props, selected)}>
        <VirtualListItemParts {...props} />
      </Pressable>
      <Separator position={position} leading={props.leading !== undefined} />
    </View>
  );
}

interface ItemPlace {
  position: VirtualListPosition;
  selected: boolean;
}

function itemPlace(props: VirtualListItemProps): ItemPlace {
  return {
    position: props.position ?? 'only',
    selected: props.selected ?? false,
  };
}

const pressHandlers = ({
  onPress,
  onLongPress,
}: VirtualListItemProps): Pick<
  VirtualListItemProps,
  'onPress' | 'onLongPress'
> => ({
  onPress,
  onLongPress,
});

// Android's ripple, clipped by the row's corners, in the pressed tint.
function usePressProps(
  props: VirtualListItemProps,
  selected: boolean,
): React.ComponentProps<typeof Pressable> & { 'aria-pressed': boolean } {
  return {
    accessibilityLabel: props.accessibilityLabel ?? props.title,
    accessibilityState: { selected },
    'aria-pressed': selected,
    android_ripple: usePressRipple(),
    ...pressHandlers(props),
    role: 'button',
    testID: props.testID,
    className: rowClasses,
  };
}

function Separator(props: {
  position: VirtualListPosition;
  leading: boolean;
}): React.ReactNode {
  const className = separatorClasses(props.position, props.leading);

  return className ? <View className={className} style={hairline} /> : null;
}

function VirtualListItemParts(props: VirtualListItemProps): React.JSX.Element {
  return (
    <>
      <ItemSlot className={leadingClasses}>{props.leading}</ItemSlot>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} role="row">
          {props.title}
        </Text>
      </View>
      <ItemSlot className={trailingClasses}>{props.trailing}</ItemSlot>
    </>
  );
}

function ItemSlot(props: {
  className: string;
  children: React.ReactNode;
}): React.ReactNode {
  if (props.children === undefined) return null;

  return <View className={props.className}>{props.children}</View>;
}

VirtualListItem satisfies React.ComponentType<VirtualListItemProps>;
