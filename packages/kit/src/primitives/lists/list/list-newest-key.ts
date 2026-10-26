import { isValidElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListProps } from './list-props';
import { ListSection } from './list-section';

let warnedAboutKeys = false;

function warnPagedItemsNeedKeys(): void {
  if (!__DEV__ || warnedAboutKeys) return;
  warnedAboutKeys = true;
  console.error(
    'List anchor="end" with pagination needs keyExtractor: without one, older rows loaded at the top read as new rows.',
  );
}

// An item with no keyExtractor is told apart by its place, as Legend List keys it; only rows loaded at the top move every place.
function unkeyedKey<Item>(props: ListProps<Item>, index: number): string {
  if (props.pagination) warnPagedItemsNeedKeys();

  return String(index);
}

function dataNewestKey<Item>(
  props: ListProps<Item>,
  items: readonly Item[],
): string {
  const index = items.length - 1;
  const item = items[index];

  if (item === undefined) return '';

  return props.keyExtractor
    ? props.keyExtractor(item, index)
    : unkeyedKey(props, index);
}

const textKey = (content: ReactNode): string =>
  typeof content === 'object' ? '' : String(content);

// Flattened children always carry a key, from Children.toArray.
function lastChildKey(
  last: React.ReactElement<{ id?: string; children?: ReactNode }>,
): string {
  return last.props.id ?? String(last.key);
}

function childNewestKey(content: ReactNode): string {
  const last = flattenedChildren(content).at(-1);

  if (!isValidElement<{ children?: ReactNode; id?: string }>(last))
    return textKey(last);

  if (last.type === ListSection) return childNewestKey(last.props.children);

  return lastChildKey(last);
}

// The key of the row a List anchored to its end shows last, so Jump to latest can tell when rows arrived.
export function newestKey<Item>(props: ListProps<Item>): string {
  if (props.anchor !== 'end') return '';

  if (props.items !== undefined) return dataNewestKey(props, props.items);

  return childNewestKey(props.children);
}
