import { useCallback, useState } from 'react';

const initialShelfHeight = 240;

interface ShelfHeight {
  height: number;
  measure: (index: number, height: number) => void;
}

export function useShelfHeight(): ShelfHeight {
  const [sizes, setSizes] = useState<ReadonlyMap<number, number>>(new Map());

  const measure = useCallback((index: number, height: number) => {
    setSizes((previous) => updatedSizes(previous, index, height));
  }, []);

  return {
    height: sizes.size === 0 ? initialShelfHeight : Math.max(...sizes.values()),
    measure,
  };
}

function updatedSizes(
  previous: ReadonlyMap<number, number>,
  index: number,
  height: number,
): ReadonlyMap<number, number> {
  if (previous.get(index) === height) return previous;
  const next = new Map(previous);

  if (height === 0) next.delete(index);
  else next.set(index, height);

  return next;
}
