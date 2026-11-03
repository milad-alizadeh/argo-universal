import { isValidElement, type ReactElement, type ReactNode } from 'react';
import type { ListChild } from './list-children';
import type { TileListProps } from './list-tile-props';

// How deep the comparison follows props into elements, arrays and plain objects before it calls them different.
const depthLimit = 6;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

function sameArray(
  first: readonly unknown[],
  second: readonly unknown[],
  depth: number,
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => sameValue(value, second[index], depth))
  );
}

function sameRecord(
  first: Record<string, unknown>,
  second: Record<string, unknown>,
  depth: number,
): boolean {
  const keys = Object.keys(first);

  return (
    keys.length === Object.keys(second).length &&
    keys.every(
      (key) => key in second && sameValue(first[key], second[key], depth),
    )
  );
}

function sameElement(
  first: ReactElement<Record<string, unknown>>,
  second: ReactElement<Record<string, unknown>>,
  depth: number,
): boolean {
  return (
    first.type === second.type &&
    first.key === second.key &&
    sameRecord(first.props, second.props, depth)
  );
}

// The same value, or an element, array or plain object drawn from the same values: it draws as it did.
function sameValue(first: unknown, second: unknown, depth: number): boolean {
  if (Object.is(first, second)) return true;

  if (depth >= depthLimit) return false;

  if (isValidElement(first) && isValidElement(second))
    return sameElement(
      first as ReactElement<Record<string, unknown>>,
      second as ReactElement<Record<string, unknown>>,
      depth + 1,
    );

  if (Array.isArray(first) && Array.isArray(second))
    return sameArray(first, second, depth + 1);

  if (isPlainObject(first) && isPlainObject(second))
    return sameRecord(first, second, depth + 1);

  return false;
}

export const sameContent = (first: ReactNode, second: ReactNode): boolean =>
  sameValue(first, second, 0);

/*
 * A List reads its children again each time its owner draws, so every row is a new entry. An entry that draws the
 * same content in the same place is the same row, and its cell does not draw again.
 */
export const sameChild = (first: ListChild, second: ListChild): boolean =>
  first.key === second.key &&
  first.position === second.position &&
  first.moveId === second.moveId &&
  first.fullSpan === second.fullSpan &&
  first.selectionMode === second.selectionMode &&
  first.selection === second.selection &&
  first.onSelectionChange === second.onSelectionChange &&
  sameContent(first.content, second.content);

export const childIdentity: Pick<
  TileListProps<ListChild>,
  'keyExtractor' | 'getItemType' | 'fullSpan' | 'itemsAreEqual'
> = {
  keyExtractor: (item) => item.key,
  fullSpan: (item) => item.fullSpan === true,
  getItemType: (item) => (item.fullSpan ? 'section' : 'item'),
  itemsAreEqual: sameChild,
};
