import { isValidElement, type ReactNode } from 'react';
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

// What an element is drawn from; any other node is itself.
const partsOf = (node: ReactNode): unknown[] =>
  isValidElement(node) ? [node.type, node.key, node.props] : [node];

/*
 * The same node, or the same element copied: reading children (`Children.toArray`) copies each element to set its
 * key, but keeps its type and its props object, so an element its owner kept still reads as the same.
 */
export function sameElement(first: ReactNode, second: ReactNode): boolean {
  const parts = partsOf(first);
  const next = partsOf(second);

  return (
    parts.length === next.length &&
    parts.every((part, index) => Object.is(part, next[index]))
  );
}

// Everything an entry holds but its content.
type Place = Omit<ListChild, 'content'>;

function samePlace(first: Place, second: Place): boolean {
  const place = Object.entries(first);
  const next = new Map(Object.entries(second));

  return (
    place.length === next.size &&
    place.every(([name, value]) => Object.is(value, next.get(name)))
  );
}

/*
 * A List reads its children again each time its owner draws, so every row is a new entry. An entry holding the same
 * element in the same place is the same row, and its cell does not draw again.
 */
export function sameChild(first: ListChild, second: ListChild): boolean {
  const { content, ...place } = first;
  const { content: next, ...nextPlace } = second;

  return sameElement(content, next) && samePlace(place, nextPlace);
}
