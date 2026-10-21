import type { ListProps } from './list-props';

// Section headers and footers occupy a full grid row, as they do in the row List.
export type TileListProps<Item> = ListProps<Item> & {
  fullSpan?: (item: Item) => boolean;
};
