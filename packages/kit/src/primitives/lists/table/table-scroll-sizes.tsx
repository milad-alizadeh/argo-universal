import {
  createContext,
  use,
  useCallback,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';

type RowSides = Partial<Record<'pinned' | 'scrolled', number>>;

type RowSizes = ReadonlyMap<string, RowSides>;

interface Measurement {
  row: string;
  side: 'pinned' | 'scrolled';
  height: number;
}

interface Sizes {
  rows: RowSizes;
  measure: (row: string, side: 'pinned' | 'scrolled', height: number) => void;
}

const ScrollSizes = createContext<Sizes>({
  rows: new Map(),
  measure: () => {},
});

// Each side measures its natural content; both use the taller result, including after text or width changes.
export function ScrollRowSizes({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [rows, setRows] = useState<RowSizes>(new Map());

  const measure = useCallback<Sizes['measure']>((row, side, height) => {
    setRows((current) => measuredRows(current, { row, side, height }));
  }, []);

  return <ScrollSizes value={{ rows, measure }}>{children}</ScrollSizes>;
}

export function useScrollRowHeight(row: string): number | undefined {
  const sizes = use(ScrollSizes).rows.get(row);

  return sizes && tallestSide(sizes);
}

interface RowProps extends ViewProps {
  row: string;
  side: 'pinned' | 'scrolled';
  contentClassName: string;
}

export function MeasuredScrollRow(props: RowProps): ReactElement {
  const { row, side, children, contentClassName, ...view } = props;
  const { measure } = use(ScrollSizes);
  const height = useScrollRowHeight(row);

  const onLayout = (event: LayoutChangeEvent): void =>
    measure(row, side, event.nativeEvent.layout.height);

  return (
    <View {...view} className="justify-center" style={{ height }}>
      <View onLayout={onLayout} className={contentClassName}>
        {children}
      </View>
    </View>
  );
}

function measuredRows(
  current: RowSizes,
  { row, side, height }: Measurement,
): RowSizes {
  if (current.get(row)?.[side] === height) return current;

  return new Map(current).set(row, { ...current.get(row), [side]: height });
}

const tallestSide = (sizes: RowSides): number =>
  Math.max(sizes.pinned ?? 0, sizes.scrolled ?? 0);
