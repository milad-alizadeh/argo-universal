import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import {
  type ControlsProps,
  type LayoutHandler,
  SearchControls,
} from './search-field-controls';
import {
  type SearchFieldGeometry,
  useSearchProgress,
} from './search-field-motion';
import { RestRow } from './search-field-parts';

export interface SearchFieldProps {
  // Names the search button and the field, and shows as the placeholder, such as "Search Agents".
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  // The row the open field replaces: the title, then other actions. Search always comes last.
  title: ReactNode;
  actions?: ReactNode;
}

const searchRowHeight = 40;

/*
 * Header and list search: a search button, last in its row, that morphs into a field over the whole row.
 * Closing clears the query. Pickers and sheets draw their own search, never this one.
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element {
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
  Pick<SearchFieldProps, 'title' | 'actions'> & {
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
