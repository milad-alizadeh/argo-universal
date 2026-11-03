import { createContext, useMemo, useState } from 'react';
import type { ListPosition } from '../../../list-context';
import type { ListProps } from './list-props';
import { dataRowPosition } from './list-row-position';

export type RowLayout = {
  // Whether a data row draws its card piece; a fixed child draws its own cell.
  cell: boolean;
  positionAt: (index: number) => ListPosition;
};

const emptyLayout: RowLayout = {
  cell: false,
  positionAt: () => 'only',
};

export const RowLayoutContext = createContext<RowLayout>(emptyLayout);

/*
 * The list's props, and a List's children, are new each time its parent draws; a row's layout changes only with the
 * places its rows hold, or every row draws again with the parent.
 */
export function useRowLayout<Item>(
  list: ListProps<Item> | undefined,
  cell: boolean,
): RowLayout {
  const positions = useRowPositions(list);
  const listed = list !== undefined;

  return useMemo(
    () =>
      listed
        ? { cell, positionAt: (index) => positions[index] ?? 'only' }
        : emptyLayout,
    [listed, cell, positions],
  );
}

function useRowPositions<Item>(
  list: ListProps<Item> | undefined,
): readonly ListPosition[] {
  const { items, getSectionKey }: Partial<ListProps<Item>> = list ?? {};

  return useSteadyPositions(
    useMemo(
      () => rowPositions({ items, getSectionKey }),
      [items, getSectionKey],
    ),
  );
}

function rowPositions<Item>(
  grouping: Pick<ListProps<Item>, 'items' | 'getSectionKey'>,
): readonly ListPosition[] {
  return (grouping.items ?? []).map((_, index) =>
    dataRowPosition(grouping, index),
  );
}

// The positions drawn before, while every row holds the place it held.
function useSteadyPositions(
  next: readonly ListPosition[],
): readonly ListPosition[] {
  const [held, setHeld] = useState(next);

  if (held === next || samePositions(held, next)) return held;

  setHeld(next);

  return next;
}

const samePositions = (
  first: readonly ListPosition[],
  second: readonly ListPosition[],
): boolean =>
  first.length === second.length &&
  first.every((position, index) => position === second[index]);
