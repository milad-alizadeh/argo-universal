import { createContext, use, type ReactElement, type ReactNode } from 'react';

const FixedSizeChromeContext = createContext(false);

/*
 * Marks the chrome whose rows have a fixed height: the window band, a heading, a Screen's header buttons, the
 * Inspector's tabs and a sheet's title row. An iOS IconButton inside it keeps the size its control size names, since
 * Dynamic Type would grow the circle past the row and over its neighbours. An IconButton anywhere else, such as in a
 * row's slot or beside content, grows with the text.
 */
export function FixedSizeChrome(props: { children: ReactNode }): ReactElement {
  return (
    <FixedSizeChromeContext value>{props.children}</FixedSizeChromeContext>
  );
}

export const useFixedSizeChrome = (): boolean => use(FixedSizeChromeContext);
