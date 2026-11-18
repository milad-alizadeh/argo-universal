import { createContext, use, useEffect } from 'react';

function noop(): void {}

/*
 * A control that is the whole row on the web: it reaches back over the frame's padding to the card's edges, so a click
 * anywhere on the row lands on it while the frame draws the tint. Its content stays centred in the row's height.
 */
export const rowPressTargetClassName =
  '-mx-4 -my-2 min-h-13 justify-center px-4 py-2';

/*
 * Whether a row sits in a Section's row frame. A ListItem there draws its own lanes and tints, so it reaches back over
 * the frame's padding to the card's edges, as a whole-row control does, instead of drawing its hover tile inset.
 */
export const InRowFrameContext = createContext(false);

// A ListItem in a row frame: back over the frame's padding, so its own tint fills the row out to the card's edges.
export const rowFrameReachClassName = 'web:-mx-4 web:-my-2';

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
