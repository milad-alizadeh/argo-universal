import { Button, Column, type ColumnProps } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import {
  buttonStyle,
  disabled,
  foregroundStyle,
  listRowBackground,
  listRowSeparator,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import {
  useSidebarList,
  useSidebarSelection,
  useStackedList,
} from '#primitives/fields/field-layout';
import { useNativeTheme } from '../../../native-theme';
import { CompactScope } from '../../../use-size-class/compact-scope';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import {
  rowUsesStockButton,
  rowContainerAccessibility,
} from './grouped-list-item-accessibility';
import { isAndroid, trailingChoiceMark } from './grouped-list-item-choice';
import { RowContent } from './grouped-list-item-native-row';
import {
  type GroupedListItemProps,
  type ResolvedItemProps,
  resolvedItem,
} from './grouped-list-item-props';
import { NativeRowDetail } from './native-row';
import { NativeRowFrame } from './native-row-frame';
import { StackedRow, useStackedCellModifiers } from './stacked-row';

type Modifiers = NonNullable<ColumnProps['modifiers']>;

const ios = Platform.OS === 'ios';

export function GroupedListItem(
  props: GroupedListItemProps,
): React.JSX.Element {
  const item = resolvedItem(props, useSizeClass());

  /*
   * The size class picks only what the row says, such as a value a wider row has room for. The row
   * itself draws as the platform's at every width, so its icons and controls keep their phone sizes.
   */
  return (
    <CompactScope>
      <StackedRow icon={leadsWithGlyph(item)}>
        <NativeRow {...trailingChoiceMark(item, isAndroid)} />
      </StackedRow>
    </CompactScope>
  );
}

const leadsWithGlyph = (item: ResolvedItemProps): boolean =>
  !!(item.icon || item.leading || item.loading);

function NativeRow(props: ResolvedItemProps): React.JSX.Element {
  const modifiers = useRowModifiers(props);

  const chosen = useSidebarSelection(
    props.label,
    !!props.selected,
    props.onPress,
  );

  // A selectable sidebar's List chooses the row itself, so the row is its tag rather than a button.
  if (chosen)
    return (
      <ColumnRow item={props} modifiers={[...modifiers, tag(props.label)]} />
    );

  return <ButtonOrColumnRow item={props} modifiers={modifiers} />;
}

function ButtonOrColumnRow({ item, modifiers }: RowProps): React.JSX.Element {
  const cell = useStackedCellModifiers();

  return rowUsesStockButton(item) && item.onPress ? (
    <PressableRow press={item.onPress} modifiers={modifiers}>
      <Column spacing={0} modifiers={cell}>
        <RowParts {...item} />
      </Column>
    </PressableRow>
  ) : (
    <ColumnRow item={item} modifiers={[...modifiers, ...cell]} />
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

/*
 * A Form row's own button, whose automatic style draws the system press highlight across the cell.
 * Outside a Form that style draws a tinted button, so a stacked row's button is plain.
 */
function PressableRow(props: PressableRowProps): React.JSX.Element {
  const style = useStackedList() ? 'plain' : 'automatic';

  return (
    <Button
      onPress={props.press}
      modifiers={[buttonStyle(style), ...props.modifiers]}
    >
      {props.children}
    </Button>
  );
}

function useRowModifiers(props: ResolvedItemProps): Modifiers {
  const sidebar = useSidebarList();
  const { colors } = useNativeTheme();

  if (!ios) return [fillMaxWidth(), ...rowContainerAccessibility(props)];

  return [
    ...(sidebar ? sidebarRowModifiers(props, colors) : []),
    ...rowContainerAccessibility(props),
    disabled(!!props.disabled),
  ];
}

/*
 * A sidebar row sits on the sidebar. Its row background (listRowBackground in modifiers/index.d.ts)
 * replaces the List's selection fill, so the open page's row draws Argo's selected tint itself, and
 * keeps Argo's foreground where SwiftUI would turn a selected row's symbols white.
 */
function sidebarRowModifiers(
  props: ResolvedItemProps,
  { selected, foreground }: NativeColors,
): Modifiers {
  const open = props.selected ? openRowColours(selected, foreground) : [];

  return open.length > 0
    ? [...open, listRowSeparator('hidden')]
    : [listRowBackground('transparent'), listRowSeparator('hidden')];
}

function openRowColours(
  selected: string | undefined,
  foreground: string | undefined,
): Modifiers {
  if (!selected || !foreground) return [];

  return [listRowBackground(selected), foregroundStyle(foreground)];
}

type NativeColors = ReturnType<typeof useNativeTheme>['colors'];

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
