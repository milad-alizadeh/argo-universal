import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type HighlightReason = 'hover' | 'press' | 'selected';

// The row index each reason points at, within one List.
type Highlighted = Partial<Record<HighlightReason, number>>;

/*
 * A List's hovered, pressed and selected rows. A highlighted row covers the separators either
 * side of it, as an iOS cell's highlight does; the one above belongs to the row above.
 */
const RowHighlights = createContext<Highlighted>({});

// Apart from the rows, so a row that only marks itself does not redraw on every hover.
export const SetRowHighlights = createContext<
  Dispatch<SetStateAction<Highlighted>> | undefined
>(undefined);

export function RowHighlightsProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [highlighted, setHighlighted] = useState<Highlighted>({});

  return (
    <SetRowHighlights value={setHighlighted}>
      <RowHighlights value={highlighted}>{children}</RowHighlights>
    </SetRowHighlights>
  );
}

// True when the separator under row `index` sits against a highlighted row, above or below it.
export function useSeparatorCovered(index?: number): boolean {
  const highlighted = useContext(RowHighlights);

  if (index === undefined) return false;

  return Object.values(highlighted).some(
    (row) => row === index || row === index + 1,
  );
}
