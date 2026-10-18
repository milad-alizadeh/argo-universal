import {
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
} from 'react';
import { useSizeClass } from '../../../use-size-class/use-size-class';

/*
 * A Form's layout margin, measured against a stock iOS 26 Form: the card's inset from the screen,
 * the cell's padding and the captions' inset are all 16 in a compact width and 20 in a wider one.
 */
const compactGutter = 16;

const regularGutter = 20;

const Gutter = createContext(compactGutter);

/*
 * The stacked list reads its width once at its root: its rows draw inside a compact scope, which
 * would otherwise read every row as compact.
 */
export function StackedGutter({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const gutter = useSizeClass() === 'compact' ? compactGutter : regularGutter;

  return <Gutter.Provider value={gutter}>{children}</Gutter.Provider>;
}

export function useStackedGutter(): number {
  return useContext(Gutter);
}
