import { Button, Column, type ColumnProps } from '@expo/ui';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityAddTraits,
  buttonStyle,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import { rowAccessibilityModifiers } from './grouped-list-item-accessibility';
import { RowContent } from './grouped-list-item-native-row';
import {
  type GroupedListItemProps,
  groupedListItemName,
} from './grouped-list-item-props';
import { GroupedListItem as WebGroupedListItem } from './grouped-list-item.tsx';
import { NativeRowDetail } from './native-row';

type Modifiers = NonNullable<ColumnProps['modifiers']>;

const ios = Platform.OS === 'ios';

export function GroupedListItem(
  props: GroupedListItemProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListItem {...props} />;

  return <NativeRow {...props} />;
}

function NativeRow(props: GroupedListItemProps): React.JSX.Element {
  const modifiers = rowModifiers(props);

  return ios && props.onPress ? (
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
  item: GroupedListItemProps;
  modifiers: Modifiers;
}

// Android's Section already sets each row in Material's list item, so the row presses itself.
function ColumnRow({ item, modifiers }: RowProps): React.JSX.Element {
  return (
    <Column
      spacing={0}
      onPress={item.onPress}
      disabled={item.disabled}
      modifiers={modifiers}
    >
      <RowParts {...item} />
    </Column>
  );
}

function RowParts(props: GroupedListItemProps): React.JSX.Element {
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
      modifiers={[
        buttonStyle('automatic'),
        ...props.modifiers,
        accessibilityAddTraits(['isButton']),
      ]}
    >
      {props.children}
    </Button>
  );
}

// A grouped row keeps the stock Form's fill, insets and separator.
function rowModifiers(props: GroupedListItemProps): Modifiers {
  if (!ios) return [fillMaxWidth(), ...rowSemantics(props)];

  return [...rowAccessibilityModifiers(props), disabled(!!props.disabled)];
}

function rowName(props: GroupedListItemProps): string {
  const name = groupedListItemName(props);

  return props.selected ? `${name}, Selected` : name;
}

// TalkBack reads the row as one name, unless a control in it needs its own focus.
function rowSemantics(props: GroupedListItemProps): Modifiers {
  if (props.control || props.detail) return [];

  return [semantics({ contentDescription: rowName(props) })];
}

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
