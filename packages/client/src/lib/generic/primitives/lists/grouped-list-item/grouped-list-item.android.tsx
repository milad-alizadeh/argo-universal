import { Button, Column, Surface } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useSidebarList } from '#primitives/fields/field-layout';
import { roundedOutline } from '#primitives/native/native-modifiers';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { RowContent } from './grouped-list-item-android-row';
import {
  type GroupedListItemProps,
  groupedListItemName,
} from './grouped-list-item-props';
import * as Web from './grouped-list-item.tsx';
import { NativeRowDetail } from './native-row-detail.android';

const tileRadius = 4;

export function GroupedListItem(
  props: GroupedListItemProps,
): React.JSX.Element {
  const wide = useWide();
  const background = useRowBackground();

  if (wide) return <Web.GroupedListItem {...props} />;

  if (!props.onPress) return <StaticRow item={props} color={background} />;

  return <PressableRow item={props} press={props.onPress} color={background} />;
}

const noPadding = { start: 0, top: 0, end: 0, bottom: 0 };

interface RowProps {
  item: GroupedListItemProps;
  color: string | undefined;
}

function StaticRow({ item, color }: RowProps): React.JSX.Element {
  return (
    <Surface {...rowContainerProps(item)} color={color}>
      <RowColumn {...item} />
    </Surface>
  );
}

interface PressableRowProps extends RowProps {
  press: () => void;
}

function PressableRow(props: PressableRowProps): React.JSX.Element {
  const { item, color } = props;

  return (
    <Button
      {...rowContainerProps(item)}
      enabled={!item.disabled}
      onClick={props.press}
      colors={useButtonColors(color)}
      contentPadding={noPadding}
    >
      <RowColumn {...item} />
    </Button>
  );
}

// The press ripple takes the content colour; left unset, Material falls back to onPrimary, a white ripple.
function useButtonColors(
  color: string | undefined,
): React.ComponentProps<typeof Button>['colors'] {
  const { foreground } = useNativeTheme().colors;

  return {
    containerColor: color,
    contentColor: foreground,
    disabledContainerColor: color,
  };
}

function rowContainerProps(
  props: GroupedListItemProps,
): Pick<React.ComponentProps<typeof Button>, 'shape' | 'modifiers'> {
  return {
    shape: roundedOutline(tileRadius),
    modifiers: [fillMaxWidth(), ...rowSemantics(props)],
  };
}

function RowColumn(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Column>
      <RowContent {...props} />
      <NativeRowDetail detail={props.detail} />
    </Column>
  );
}

function rowName(props: GroupedListItemProps): string {
  const name = groupedListItemName(props);

  return props.selected ? `${name}, Selected` : name;
}

// A sidebar row sits flat on the screen.
function useRowBackground(): string | undefined {
  const { muted } = useNativeTheme().colors;

  return useSidebarList() ? 'transparent' : muted;
}

function rowSemantics(
  props: GroupedListItemProps,
): ReturnType<typeof semantics>[] {
  if (props.control || props.detail) return [];

  return [semantics({ contentDescription: rowName(props) })];
}

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
