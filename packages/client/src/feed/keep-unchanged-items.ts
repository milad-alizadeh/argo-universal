import { type FeedView, type FeedViewItem, feedItemKey } from './feed-view';

const sameList = <Value>(
  first: readonly Value[],
  second: readonly Value[],
  isSame: (first: Value, second: Value) => boolean = Object.is,
) =>
  first.length === second.length &&
  first.every((value, index) => isSame(value, second[index] as Value));

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
  const previousItems = new Map(previous.items.map(toKeyedEntry));
  const keepIfUnchanged = (item: FeedViewItem): FeedViewItem => {
    const previousItem = previousItems.get(itemKey(item));
    if (previousItem && sameItem(previousItem, item)) return previousItem;
    if (item.type !== 'group' || previousItem?.type !== 'group') return item;
    // A changed group still keeps its unchanged activities.
    const previousActivities = new Map(previousItem.items.map(toKeyedEntry));
    return {
      ...item,
      items: item.items.map((activity) => {
        const previousActivity = previousActivities.get(itemKey(activity));
        return previousActivity && sameItem(previousActivity, activity)
          ? (previousActivity as typeof activity)
          : activity;
      }),
    };
  };
  return { ...next, items: next.items.map(keepIfUnchanged) };
}

const itemKey = (item: FeedViewItem) => `${item.type}:${feedItemKey(item)}`;

const toKeyedEntry = (item: FeedViewItem) => [itemKey(item), item] as const;
