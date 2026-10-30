import type { FeedViewItem } from './feed-view';

// A wire row is compared as a whole; every other object and array is compared field by field.
const isStructure = <Value>(value: Value): value is Value & object =>
  typeof value === 'object' && value !== null && !('sessionUpdate' in value);

function sameFields<Value extends object>(
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

function sameStructures<Value>(first: Value, second: Value): boolean {
  return isStructure(first) && isStructure(second) && sameFields(first, second);
}

const sameValue = <Value>(first: Value, second: Value): boolean =>
  Object.is(first, second) || sameStructures(first, second);

/*
 * Two items are the same when every field of each is: a field added to an item is compared with no code here.
 * Wire rows are new objects when they change, so a row is the same row only when it is the same object.
 */
export const sameItem = (first: FeedViewItem, second: FeedViewItem): boolean =>
  sameValue(first, second);
