import type * as React from 'react';
import { useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import {
  type ControlsProps,
  type LayoutHandler,
  SearchControls,
} from './search-field-controls';
import { DockedSearchField } from './search-field-docked';
import {
  type SearchFieldGeometry,
  useSearchProgress,
} from './search-field-motion';
import { RestRow } from './search-field-parts';
import type {
  MorphSearchFieldProps,
  SearchFieldProps,
} from './search-field-props';

const searchRowHeight = 40;

/*
 * Header and list search. By default a search button, last in its row, that morphs into a field over
 * the whole row; closing clears the query. Docked, a phone list's search bar at the top of the list,
 * which only Android draws. Pickers and sheets draw their own search, never this one.
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element | null {
  if (props.variant === 'docked') return <DockedSearchField {...props} />;

  return <MorphSearchField {...props} />;
}

function MorphSearchField(props: MorphSearchFieldProps): React.JSX.Element {
  const [geometry, measureRow, measureTrigger] = useGeometry();
  // A query left over from before, such as a restored screen, keeps the field open.
  const [open, setOpen] = useState(props.value !== '');
  const morph = { open, progress: useSearchProgress(open), geometry };

  return (
    <SearchRow
      {...props}
      morph={morph}
      setOpen={setOpen}
      onRowLayout={measureRow}
      onTriggerLayout={measureTrigger}
    />
  );
}

type RowProps = ControlsProps &
  Pick<MorphSearchFieldProps, 'title' | 'actions'> & {
    onRowLayout: LayoutHandler;
  };

function SearchRow(props: RowProps): React.JSX.Element {
  const style = useRowStyle();

  return (
    <View
      className="h-10 min-w-0 flex-1 flex-row items-center gap-1"
      style={style}
      onLayout={props.onRowLayout}
    >
      <RestRow {...props.morph} title={props.title} actions={props.actions} />
      <SearchControls {...props} />
    </View>
  );
}

function useRowStyle(): { height: number } | undefined {
  const { fontScale } = useWindowDimensions();

  return Platform.OS === 'web'
    ? undefined
    : { height: searchRowHeight * Math.max(1, fontScale) };
}

function useGeometry(): [SearchFieldGeometry, LayoutHandler, LayoutHandler] {
  const [rowWidth, setRowWidth] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(0);

  return [
    { rowWidth, triggerWidth },
    ({ nativeEvent }) => setRowWidth(nativeEvent.layout.width),
    ({ nativeEvent }) => setTriggerWidth(nativeEvent.layout.width),
  ];
}

export type {
  DockedSearchQuery,
  SearchFieldProps,
  SearchQueryProps,
} from './search-field-props';
