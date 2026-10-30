import type * as React from 'react';
import { useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { type ControlsProps, SearchControls } from './search-field-controls';
import {
  type SearchFieldGeometry,
  useSearchProgress,
} from './search-field-motion';
import {
  hasTrailingActions,
  RestRow,
  TrailingActions,
} from './search-field-parts';
import type { LayoutHandler, SearchFieldProps } from './search-field-props';

const searchRowHeight = 40;

// The row's `gap-1`, which stands between the search button and the actions after it.
const rowGap = 4;

/*
 * Header and list search: a search button, last in its row (first before the actions in a sidebar), that morphs into a
 * field over the whole row; closing clears the query. Pickers and sheets draw their own search, never this one.
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element {
  return <SearchRow {...props} {...useMorph(props)} />;
}

type Morph = Pick<RowProps, 'morph' | 'setOpen'> & LayoutHandlers;

// A query left over from before, such as a restored screen, keeps the field open.
function useMorph(props: SearchFieldProps): Morph {
  const { geometry, ...layout } = useGeometry(hasTrailingActions(props));
  const [open, setOpen] = useState(props.value !== '');
  const progress = useSearchProgress(open);
  const morph = { open, progress, geometry, sidebar: props.sidebar };

  return { morph, setOpen, ...layout };
}

type RowProps = ControlsProps &
  Pick<SearchFieldProps, 'title' | 'actions'> & {
    onRowLayout: LayoutHandler;
    onActionsLayout: LayoutHandler;
  };

function SearchRow(props: RowProps): React.JSX.Element {
  const rest = { ...props.morph, title: props.title, actions: props.actions };

  return (
    <View
      className="h-10 min-w-0 flex-1 flex-row items-center gap-1"
      style={useRowStyle()}
      onLayout={props.onRowLayout}
    >
      <RestRow {...rest} />
      <SearchControls {...props} />
      <TrailingActions {...rest} onLayout={props.onActionsLayout} />
    </View>
  );
}

function useRowStyle(): { height: number } | undefined {
  const { fontScale } = useWindowDimensions();

  return Platform.OS === 'web'
    ? undefined
    : { height: searchRowHeight * Math.max(1, fontScale) };
}

/*
 * How far the button's right edge sits in from the row's: what the actions after it take, and the row's gap before
 * them. It is read from the actions' own box rather than from where the button lands in the row, because a layout
 * event reports a view's size and not its move: a row that narrows leaves the button's place behind, and the lens
 * and the open field's right edge would be left over the last action (#1442). Before the actions are measured, and
 * wherever there are none, the button ends the row.
 */
const insetOf = (actionsWidth: number): number =>
  actionsWidth === 0 ? 0 : actionsWidth + rowGap;

interface LayoutHandlers {
  onRowLayout: LayoutHandler;
  onTriggerLayout: LayoutHandler;
  onActionsLayout: LayoutHandler;
}

type RowGeometry = LayoutHandlers & { geometry: SearchFieldGeometry };

// `trailing` keeps a row that drops its actions from holding on to the width they last reported.
function useGeometry(trailing: boolean): RowGeometry {
  const [rowWidth, setRowWidth] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [actionsWidth, setActionsWidth] = useState(0);
  const triggerInset = insetOf(trailing ? actionsWidth : 0);

  return {
    geometry: { rowWidth, triggerWidth, triggerInset },
    onRowLayout: ({ nativeEvent }) => setRowWidth(nativeEvent.layout.width),
    onTriggerLayout: ({ nativeEvent }) =>
      setTriggerWidth(nativeEvent.layout.width),
    onActionsLayout: ({ nativeEvent }) =>
      setActionsWidth(nativeEvent.layout.width),
  };
}

export type { SearchFieldProps } from './search-field-props';
