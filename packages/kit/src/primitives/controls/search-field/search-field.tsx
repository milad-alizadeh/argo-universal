import type * as React from 'react';
import { useState } from 'react';
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
import { RestRow, TrailingActions } from './search-field-parts';
import type { SearchFieldProps } from './search-field-props';

const searchRowHeight = 40;

/*
 * Header and list search: a search button, last in its row (first before the actions in a sidebar), that morphs into a
 * field over the whole row; closing clears the query. Pickers and sheets draw their own search, never this one.
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element {
  return <SearchRow {...props} {...useMorph(props)} />;
}

type Morph = Pick<
  RowProps,
  'morph' | 'setOpen' | 'onRowLayout' | 'onTriggerLayout'
>;

// A query left over from before, such as a restored screen, keeps the field open.
function useMorph(props: SearchFieldProps): Morph {
  const [geometry, onRowLayout, onTriggerLayout] = useGeometry();
  const [open, setOpen] = useState(props.value !== '');
  const progress = useSearchProgress(open);
  const morph = { open, progress, geometry, sidebar: props.sidebar };

  return { morph, setOpen, onRowLayout, onTriggerLayout };
}

type RowProps = ControlsProps &
  Pick<SearchFieldProps, 'title' | 'actions'> & {
    onRowLayout: LayoutHandler;
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
      <TrailingActions {...rest} />
    </View>
  );
}

function useRowStyle(): { height: number } | undefined {
  const { fontScale } = useWindowDimensions();

  return Platform.OS === 'web'
    ? undefined
    : { height: searchRowHeight * Math.max(1, fontScale) };
}

// How far the button's right edge sits in from the row's; before it is measured it is taken to end the row.
const insetOf = (
  rowWidth: number,
  trigger: { x: number; width: number },
): number =>
  trigger.width === 0 ? 0 : Math.max(0, rowWidth - trigger.x - trigger.width);

function useGeometry(): [SearchFieldGeometry, LayoutHandler, LayoutHandler] {
  const [rowWidth, setRowWidth] = useState(0);
  const [trigger, setTrigger] = useState({ x: 0, width: 0 });
  const triggerWidth = trigger.width;

  return [
    { rowWidth, triggerWidth, triggerInset: insetOf(rowWidth, trigger) },
    ({ nativeEvent }) => setRowWidth(nativeEvent.layout.width),
    ({ nativeEvent }) =>
      setTrigger({ x: nativeEvent.layout.x, width: nativeEvent.layout.width }),
  ];
}

export type { SearchFieldProps } from './search-field-props';
