import { useState, type ReactElement } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { DetailColumnsProps } from './detail-props';

// The narrowest container that holds the content beside the 280 Metadata column.
const splitWidth = 720;

const layouts = {
  split: {
    row: 'flex-row items-start gap-6',
    content: 'min-w-0 flex-1',
    metadata: 'w-70 shrink-0',
  },
  stacked: { row: 'gap-6', content: undefined, metadata: undefined },
} as const;

type Layout = (typeof layouts)[keyof typeof layouts];

// Desktop and web: Metadata in a side column, moving below the content in a narrow container.
export function DetailColumns(props: DetailColumnsProps): ReactElement {
  const { layout, onLayout } = useColumnsLayout();

  return (
    <View onLayout={onLayout} className={layout.row}>
      <View className={layout.content}>{props.children}</View>
      {props.metadata ? (
        <View className={layout.metadata}>{props.metadata}</View>
      ) : null}
    </View>
  );
}

interface ColumnsLayout {
  layout: Layout;
  onLayout: (event: LayoutChangeEvent) => void;
}

function useColumnsLayout(): ColumnsLayout {
  const [width, setWidth] = useState(0);

  return {
    layout: width >= splitWidth ? layouts.split : layouts.stacked,
    onLayout: (event) => setWidth(event.nativeEvent.layout.width),
  };
}
