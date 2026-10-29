import type { FeedViewItem } from './feed-view';

const isObject = <Value>(value: Value): value is Value & object =>
  typeof value === 'object' && value !== null;

function sameEntries<Value extends object>(
  first: Value,
  second: Value,
): boolean {
  const entries = Object.entries(first);
  const others = new Map(Object.entries(second));

  if (entries.length !== others.size) return false;

  return entries.every(
    ([key, value]) => others.has(key) && sameValue(value, others.get(key)),
  );
}

function sameObjects<Value>(first: Value, second: Value): boolean {
  if (!isObject(first)) return false;

  return isObject(second) && sameEntries(first, second);
}

function sameValue<Value>(first: Value, second: Value): boolean {
  return Object.is(first, second) || sameObjects(first, second);
}

/*
 * Items are plain data, so two items are the same when every field of every nested value is: a field added to an item
 * is compared with no code here. A row that is the same object is the same row without a walk.
 */
export const sameItem = (first: FeedViewItem, second: FeedViewItem): boolean =>
  sameValue(first, second);
