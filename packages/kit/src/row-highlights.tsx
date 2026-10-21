import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Platform, type PressableProps } from 'react-native';
import { ListContext } from './list-context';

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
  const setHighlighted = useContext(SetHighlightedRow);
  const mark = useRowMark(setHighlighted);

  return mark && interactive ? marking(row, mark) : row;
}

// A row that draws a tint and keeps no hover or press handlers of its own.
export const useRowHighlight = (): RowHighlightHandlers =>
  useRowHighlightHandlers({}, true);

// A finger holds iOS's row; a pointer passes over the web's. Android has no separators to cover.
const marksRows = Platform.OS === 'web' || Platform.OS === 'ios';

type Mark = (held: boolean) => void;

function useRowMark(
  setHighlighted: Dispatch<SetStateAction<number | undefined>> | undefined,
): Mark | undefined {
  const { index } = useContext(ListContext);

  if (!setHighlighted || !marksRows) return undefined;

  return (held) => setHighlighted(held ? index : undefined);
}

const marking = (
  row: RowHighlightHandlers,
  mark: Mark,
): RowHighlightHandlers =>
  Platform.OS === 'web' ? hovering(row, mark) : holding(row, mark);

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
