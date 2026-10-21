import type { ListChild } from './list-children';
import type { TileListProps } from './list-tile-props';

export const childIdentity: Pick<
  TileListProps<ListChild>,
  'keyExtractor' | 'getItemType' | 'fullSpan'
> = {
  keyExtractor: (item) => item.key,
  fullSpan: (item) => item.fullSpan === true,
  getItemType: (item) => (item.fullSpan ? 'section' : 'item'),
};
