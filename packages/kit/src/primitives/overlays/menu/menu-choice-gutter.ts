import { createContext, use } from 'react';

// Set inside a menu with a row that can be ticked: every row then keeps the check's place, so icons and labels line up.
export const ChoiceGutterContext = createContext(false);

export const useChoiceGutter = (): boolean => use(ChoiceGutterContext);

// Whether any row of the menu can be ticked.
export const hasChoice = (rows: readonly object[]): boolean =>
  rows.some((row) => 'selected' in row && row.selected !== undefined);
