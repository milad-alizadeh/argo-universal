import type { FeedView, FeedViewItem } from './feed-view';

const sameList = <Value>(
  first: readonly Value[],
  second: readonly Value[],
  same: (first: Value, second: Value) => boolean = Object.is,
) =>
  first.length === second.length &&
  first.every((value, index) => same(value, second[index] as Value));

// Rows are compared by reference: the Feed state replaces a row only when it changes.
function sameItem(first: FeedViewItem, second: FeedViewItem): boolean {
  if (first === second) return true;
  if (first.type === 'group' && second.type === 'group')
    return (
      first.id === second.id &&
      first.title === second.title &&
      first.state === second.state &&
      sameList<FeedViewItem>(first.items, second.items, sameItem)
    );
  if (first.type === 'exploration' && second.type === 'exploration')
    return (
      first.id === second.id &&
      first.title === second.title &&
      sameList(first.lines, second.lines) &&
      sameList(first.toolCalls, second.toolCalls)
    );
  if ('row' in first && 'row' in second)
    return first.type === second.type && first.row === second.row;
  return false;
}

// The new view with each unchanged item swapped for its previous object, so memoised rows skip their render.
export function keepUnchangedItems(
  previous: FeedView | null,
  next: FeedView,
): FeedView {
  if (!previous) return next;
  const previousItems = new Map(previous.items.map(withKey));
  const reuse = (item: FeedViewItem): FeedViewItem => {
    const known = previousItems.get(itemKey(item));
    if (known && sameItem(known, item)) return known;
    if (item.type !== 'group' || known?.type !== 'group') return item;
    // A changed group still keeps its unchanged activities.
    const activities = new Map(known.items.map(withKey));
    return {
      ...item,
      items: item.items.map((activity) => {
        const knownActivity = activities.get(itemKey(activity));
        return knownActivity && sameItem(knownActivity, activity)
          ? (knownActivity as typeof activity)
          : activity;
      }),
    };
  };
  return { ...next, items: next.items.map(reuse) };
}

function itemKey(item: FeedViewItem): string {
  const id =
    item.type === 'group' || item.type === 'exploration'
      ? item.id
      : item.row.id;
  return `${item.type}:${id}`;
}

const withKey = (item: FeedViewItem) => [itemKey(item), item] as const;
