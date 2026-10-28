import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PressableProps } from 'react-native';
import { RowPositionContext } from './list-context';
import type { RowHighlight } from './list-look';
import { useListLook } from './list-look-context';

/*
 * The row the pointer or finger is on: the web's hovered row, iOS's pressed one. Its tint covers the separators
 * either side of it, as a stock iOS cell's does, so no line ever touches a tint. Android draws no separators.
 */
const HighlightedRow = createContext<number | undefined>(undefined);

// Apart from the row, so a row that only marks itself does not redraw on every press.
const SetHighlightedRow = createContext<
  Dispatch<SetStateAction<number | undefined>> | undefined
>(undefined);

export function RowHighlightProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [highlighted, setHighlighted] = useState<number>();

  return (
    <SetHighlightedRow value={setHighlighted}>
      <HighlightedRow value={highlighted}>{children}</HighlightedRow>
    </SetHighlightedRow>
  );
}

// True when the separator under row `index` sits against the highlighted row, above or below it.
export function useSeparatorCovered(index?: number): boolean {
  const highlighted = useContext(HighlightedRow);

  return (
    index !== undefined && (highlighted === index || highlighted === index + 1)
  );
}

type RowHighlightHandlers = Pick<
  PressableProps,
  'onPressIn' | 'onPressOut' | 'onHoverIn' | 'onHoverOut'
>;

/*
 * Marks the row as the pointer arrives and leaves it, keeping the row's own handlers. A row that does nothing takes
 * no tint, so it marks nothing either.
 */
export function useRowHighlightHandlers(
  row: RowHighlightHandlers,
  interactive: boolean,
): RowHighlightHandlers {
  const marker = useRowMarker();

  return marker && interactive ? marking(row, marker) : row;
}

// A row that draws a tint and keeps no hover or press handlers of its own.
export const useRowHighlight = (): RowHighlightHandlers =>
  useRowHighlightHandlers({}, true);

interface Marker {
  highlight: RowHighlight;
  mark: (held: boolean) => void;
}

// A row marks only where its List look says it is marked, and only inside a section that tracks it.
function useRowMarker(): Marker | undefined {
  const setHighlighted = useContext(SetHighlightedRow);
  const { rowHighlight } = useListLook();
  const { index } = useContext(RowPositionContext);

  if (!setHighlighted || !rowHighlight) return undefined;

  return {
    highlight: rowHighlight,
    mark: (held) => setHighlighted(held ? index : undefined),
  };
}

// A finger holds iOS's row; a pointer passes over the web's. Android has no separators to cover.
const marking = (
  row: RowHighlightHandlers,
  { highlight, mark }: Marker,
): RowHighlightHandlers =>
  highlight === 'hover' ? hovering(row, mark) : holding(row, mark);

type Mark = Marker['mark'];

function hovering(row: RowHighlightHandlers, mark: Mark): RowHighlightHandlers {
  return {
    ...row,
    onHoverIn: (event) => {
      mark(true);
      row.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      mark(false);
      row.onHoverOut?.(event);
    },
  };
}

function holding(row: RowHighlightHandlers, mark: Mark): RowHighlightHandlers {
  return {
    ...row,
    onPressIn: (event) => {
      mark(true);
      row.onPressIn?.(event);
    },
    onPressOut: (event) => {
      mark(false);
      row.onPressOut?.(event);
    },
  };
}

// A lifted row keeps the separators either side of its slot covered while it is dragged, as a held row's tint does.
export function useLiftedRowMark(lifted: boolean): void {
  const setHighlighted = useContext(SetHighlightedRow);
  const { rowHighlight } = useListLook();
  const { index } = useContext(RowPositionContext);
  const marks = lifted && rowHighlight === 'press' ? setHighlighted : undefined;

  useEffect(() => {
    if (!marks) return;

    marks(index);

    return () => marks(undefined);
  }, [marks, index]);
}
