import type { OnViewableItemsChanged } from '@legendapp/list/react-native';
import { createContext, useCallback, useState } from 'react';

export const TileVisibility = createContext<ReadonlySet<number>>(new Set());

interface Visibility<Item> {
  indices: ReadonlySet<number>;
  update: NonNullable<OnViewableItemsChanged<Item>>;
}

export function useTileVisibility<Item>(): Visibility<Item> {
  const [indices, setIndices] = useState<ReadonlySet<number>>(new Set());

  const update = useCallback<NonNullable<OnViewableItemsChanged<Item>>>(
    ({ viewableItems }) => {
      setIndices(new Set(viewableItems.map((item) => item.index)));
    },
    [],
  );

  return { indices, update };
}
