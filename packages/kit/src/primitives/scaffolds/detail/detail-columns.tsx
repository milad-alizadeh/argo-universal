import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { type LayoutChangeEvent, View, type ViewInstance } from 'react-native';
import { sideColumn } from '#kit/content-column/column-layout';
import { useClaimSide } from '#kit/content-column/content-column';
import type { DetailColumnsProps } from './detail-props';

// The narrowest container that holds the content beside the 280 Metadata column.
const splitWidth = 720;

// The Metadata column's width and the gap are the side column's, which the Screen's column widens by.
const layouts = {
  split: {
    row: 'flex-row items-start',
    content: 'min-w-0 flex-1',
    metadata: 'shrink-0',
    metadataStyle: { width: sideColumn.width },
  },
  stacked: {
    row: undefined,
    content: undefined,
    metadata: undefined,
    metadataStyle: undefined,
  },
} as const;

const rowGap = { gap: sideColumn.gap };

type Layout = (typeof layouts)[keyof typeof layouts];

/*
 * Metadata in a side column, moving below the content in a narrow container (every phone). A container that narrow is
 * already inside the Screen's reading width, so reporting the side column then widens nothing.
 */
export function DetailColumns(props: DetailColumnsProps): ReactElement {
  const { ref, layout, onLayout } = useColumnsLayout();
  useClaimSide(Boolean(props.metadata));

  return (
    <View ref={ref} onLayout={onLayout} className={layout.row} style={rowGap}>
      <View className={layout.content}>{props.children}</View>
      {props.metadata ? (
        <View className={layout.metadata} style={layout.metadataStyle}>
          {props.metadata}
        </View>
      ) : null}
    </View>
  );
}

interface ColumnsLayout {
  ref: RefObject<ViewInstance | null>;
  layout: Layout;
  onLayout: (event: LayoutChangeEvent) => void;
}

function useColumnsLayout(): ColumnsLayout {
  const ref = useRef<ViewInstance>(null);
  const [width, setWidth] = useState(0);

  // Measure before the first paint so a wide container never flashes the stacked layout.
  useLayoutEffect(() => {
    setWidth(ref.current?.getBoundingClientRect().width ?? 0);
  }, []);

  return {
    ref,
    layout: width >= splitWidth ? layouts.split : layouts.stacked,
    onLayout: (event) => setWidth(event.nativeEvent.layout.width),
  };
}
