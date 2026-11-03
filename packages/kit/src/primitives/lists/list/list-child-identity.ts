import type { ListChild } from './list-children';
import { sameContent } from './list-same-content';
import type { TileListProps } from './list-tile-props';

// Every field of a child but its content, which is compared by what it draws.
const placeOf = ({
  content: _content,
  ...place
}: ListChild): Omit<ListChild, 'content'> => place;

function samePlace(first: ListChild, second: ListChild): boolean {
  const place = Object.entries(placeOf(first));
  const next = new Map(Object.entries(placeOf(second)));

  return (
    place.length === next.size &&
    place.every(([name, value]) => Object.is(value, next.get(name)))
  );
}

/*
 * A List reads its children again each time its owner draws, so every row is a new entry. An entry that draws the
 * same content in the same place is the same row, and its cell does not draw again.
 */
export const sameChild = (first: ListChild, second: ListChild): boolean =>
  samePlace(first, second) && sameContent(first.content, second.content);

export const childIdentity: Pick<
  TileListProps<ListChild>,
  'keyExtractor' | 'getItemType' | 'fullSpan' | 'itemsAreEqual'
> = {
  keyExtractor: (item) => item.key,
  fullSpan: (item) => item.fullSpan === true,
  getItemType: (item) => (item.fullSpan ? 'section' : 'item'),
  itemsAreEqual: sameChild,
};
