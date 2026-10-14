import { useState } from 'react';
import type { SheetList } from './sheet-list-context';

const heightTolerance = 1;

export type SheetListFit = {
  // The sheet's height that shows every row, once the list has reported it.
  height?: number;
  // What the sheet tells its list, given the sheet's measured height.
  list: (viewportHeight: number | undefined) => SheetList;
};

/*
 * A sheet that fits its list takes its own height, less the list's frame, plus the list's rows:
 * once it has risen the frame holds the rows, so the height settles.
 */
export function useSheetListFit(fitList: boolean | undefined): SheetListFit {
  const [height, setHeight] = useState<number>();

  return {
    height,
    list: (viewportHeight) =>
      fitList && viewportHeight !== undefined
        ? fittingList(viewportHeight, setHeight)
        : {},
  };
}

function fittingList(
  viewportHeight: number,
  setHeight: (update: (last: number | undefined) => number) => void,
): SheetList {
  return {
    onGeometry: ({ containerHeight, contentHeight }) => {
      const next = viewportHeight - containerHeight + contentHeight;
      setHeight((last) => settledHeight(last, Math.ceil(next)));
    },
  };
}

function settledHeight(last: number | undefined, next: number): number {
  if (last !== undefined && Math.abs(last - next) <= heightTolerance)
    return last;

  return next;
}
