import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { type LayoutChangeEvent, View, type ViewInstance } from 'react-native';
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

// Metadata in a side column, moving below the content in a narrow container (every phone).
export function DetailColumns(props: DetailColumnsProps): ReactElement {
  const { ref, layout, onLayout } = useColumnsLayout();

  return (
    <View ref={ref} onLayout={onLayout} className={layout.row}>
      <View className={layout.content}>{props.children}</View>
      {props.metadata ? (
        <View className={layout.metadata}>{props.metadata}</View>
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
