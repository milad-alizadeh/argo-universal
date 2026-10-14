import { Button, Column, Surface } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { useNavigationFields } from '../../fields/field-layout';
import { roundedOutline } from '../../native/compose-corners';
import { RowContent } from './list-item-android-row';
import { type ListItemProps, listItemName } from './list-item-props';
import * as Web from './list-item.tsx';
import { NativeRowDetail } from './native-row';

const tileRadius = 4;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const background = useRowBackground();

  if (wide) return <Web.ListItem {...props} />;

  if (!props.onPress) return <StaticRow item={props} color={background} />;

  return <PressableRow item={props} press={props.onPress} color={background} />;
}

const noPadding = { start: 0, top: 0, end: 0, bottom: 0 };

interface RowProps {
  item: ListItemProps;
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
  props: ListItemProps,
): Pick<React.ComponentProps<typeof Button>, 'shape' | 'modifiers'> {
  return {
    shape: roundedOutline(tileRadius),
    modifiers: [fillMaxWidth(), ...rowSemantics(props)],
  };
}

function RowColumn(props: ListItemProps): React.JSX.Element {
  return (
    <Column>
      <RowContent {...props} />
      <NativeRowDetail detail={props.detail} />
    </Column>
  );
}

function rowName(props: ListItemProps): string {
  const name = listItemName(props);

  return props.selected ? `${name}, Selected` : name;
}

// A navigation row sits flat on the screen, like the sidebar's.
function useRowBackground(): string | undefined {
  const { muted } = useNativeTheme().colors;

  return useNavigationFields() ? 'transparent' : muted;
}

function rowSemantics(props: ListItemProps): ReturnType<typeof semantics>[] {
  if (props.control || props.detail) return [];

  return [semantics({ contentDescription: rowName(props) })];
}
