import { Button, Column, type ColumnProps } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import {
  buttonStyle,
  disabled,
  listRowBackground,
  listRowSeparator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useSidebarList } from '#primitives/fields/field-layout';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import {
  rowUsesStockButton,
  rowContainerAccessibility,
} from './grouped-list-item-accessibility';
import { RowContent } from './grouped-list-item-native-row';
import {
  type GroupedListItemProps,
  type ResolvedItemProps,
  resolvedItem,
} from './grouped-list-item-props';
import { GroupedListItem as WebGroupedListItem } from './grouped-list-item.tsx';
import { NativeRowDetail } from './native-row';
import { NativeRowFrame } from './native-row-frame';

type Modifiers = NonNullable<ColumnProps['modifiers']>;

const ios = Platform.OS === 'ios';

export function GroupedListItem(
  props: GroupedListItemProps,
): React.JSX.Element {
  const sizeClass = useSizeClass();

  if (sizeClass === 'wide') return <WebGroupedListItem {...props} />;

  return <NativeRow {...resolvedItem(props, sizeClass)} />;
}

function NativeRow(props: ResolvedItemProps): React.JSX.Element {
  const modifiers = rowModifiers(props, useSidebarList());

  return rowUsesStockButton(props) && props.onPress ? (
    <PressableRow press={props.onPress} modifiers={modifiers}>
      <Column spacing={0}>
        <RowParts {...props} />
      </Column>
    </PressableRow>
  ) : (
    <ColumnRow item={props} modifiers={modifiers} />
  );
}

interface RowProps {
  item: ResolvedItemProps;
  modifiers: Modifiers;
}

// The platform frame supplies a stock ListItem on Android and leaves SwiftUI's Form in charge on iOS.
function ColumnRow({ item, modifiers }: RowProps): React.JSX.Element {
  return (
    <NativeRowFrame item={item} modifiers={modifiers}>
      <RowParts {...item} />
    </NativeRowFrame>
  );
}

function RowParts(props: ResolvedItemProps): React.JSX.Element {
  return (
    <>
      <RowContent {...props} />
      <NativeRowDetail detail={props.detail} />
    </>
  );
}

interface PressableRowProps {
  press: () => void;
  modifiers: Modifiers;
  children: React.ReactElement;
}

// A Form row's own button, whose automatic style draws the system press highlight across the cell.
function PressableRow(props: PressableRowProps): React.JSX.Element {
  return (
    <Button
      onPress={props.press}
      modifiers={[buttonStyle('automatic'), ...props.modifiers]}
    >
      {props.children}
    </Button>
  );
}

function rowModifiers(props: ResolvedItemProps, sidebar: boolean): Modifiers {
  if (!ios) return [fillMaxWidth(), ...rowContainerAccessibility(props)];

  return [
    ...(sidebar
      ? [listRowBackground('transparent'), listRowSeparator('hidden')]
      : []),
    ...rowContainerAccessibility(props),
    disabled(!!props.disabled),
  ];
}

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
