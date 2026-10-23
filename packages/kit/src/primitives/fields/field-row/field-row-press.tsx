import { createContext, use, useEffect } from 'react';

function noop(): void {}

// The row frame a Section draws around each row, told by the row inside whether pressing it does something.
export const RowPressContext =
  createContext<(pressable: boolean) => void>(noop);

/*
 * A pressable web row calls this, so the frame around it draws the hover and pressed tint over the whole row. A row
 * that only presses on part of itself (a Picker's value) or not at all leaves the frame still.
 */
export function useRowPressable(pressable: boolean): void {
  const mark = use(RowPressContext);

  useEffect(() => {
    mark(pressable);

    return (): void => mark(false);
  }, [mark, pressable]);
}
