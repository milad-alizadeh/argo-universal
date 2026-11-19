import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PressableProps } from 'react-native';
import { RowPositionContext } from './list-context';
import type { RowHighlight } from './list-look';
import { useListLook } from './list-look-context';

type SetHighlighted = Dispatch<SetStateAction<number | undefined>>;

/*
 * The row the pointer or finger is on: the web's hovered row, iOS's pressed one. Its tint covers the separators
 * either side of it, as a stock iOS cell's does, so no line ever touches a tint. Android draws no separators.
 *
 * Kept outside React's context so a change reaches only the rows whose separators it covers or uncovers: a pointer
 * resting on a scrolling list hovers row after row, and a context value above the list would visit every row each time.
 */
interface HighlightedRow {
  read: () => number | undefined;
  set: SetHighlighted;
  subscribe: (listener: Listener) => () => void;
}

type Listener = () => void;

const resolved = (
  action: SetStateAction<number | undefined>,
  current: number | undefined,
): number | undefined =>
  typeof action === 'function' ? action(current) : action;

const subscriber =
  (listeners: Set<Listener>): HighlightedRow['subscribe'] =>
  (listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  };

function highlightedRow(): HighlightedRow {
  let highlighted: number | undefined;
  const listeners = new Set<Listener>();

  const set: SetHighlighted = (action) => {
    const next = resolved(action, highlighted);

    if (next === highlighted) return;

    highlighted = next;
    listeners.forEach((listener) => listener());
  };

  return { read: () => highlighted, set, subscribe: subscriber(listeners) };
}

const HighlightedRowContext = createContext<HighlightedRow | undefined>(
  undefined,
);

export function RowHighlightProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [row] = useState(highlightedRow);

  return <HighlightedRowContext value={row}>{children}</HighlightedRowContext>;
}

const unsubscribed = (): (() => void) => () => {};

const sitsAgainst = (highlighted: number | undefined, index: number): boolean =>
  highlighted === index || highlighted === index + 1;

// True when the separator under row `index` sits against the highlighted row, above or below it.
export function useSeparatorCovered(index?: number): boolean {
  const row = useContext(HighlightedRowContext);

  const covered = (): boolean =>
    index !== undefined && sitsAgainst(row?.read(), index);

  return useSyncExternalStore(row?.subscribe ?? unsubscribed, covered, covered);
}

const useSetHighlighted = (): SetHighlighted | undefined =>
  useContext(HighlightedRowContext)?.set;

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
  const setHighlighted = useSetHighlighted();
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
  const setHighlighted = useSetHighlighted();
  const { rowHighlight } = useListLook();
  const { index } = useContext(RowPositionContext);
  const marks = lifted && rowHighlight === 'press' ? setHighlighted : undefined;

  useEffect(() => {
    if (!marks) return;

    marks(index);

    // Clears only its own mark: another row may have marked itself since.
    return (): void =>
      marks((current) => (current === index ? undefined : current));
  }, [marks, index]);
}
