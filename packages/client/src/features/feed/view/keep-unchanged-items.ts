import { type FeedView, type FeedViewItem, feedItemKey } from './feed-view';

const sameList = <Value>(
  first: readonly Value[],
  second: readonly Value[],
  isSame: (first: Value, second: Value) => boolean = Object.is,
): boolean => {
  if (first.length !== second.length) return false;
  const following = second.values();
  return first.every((value) => {
    const other = following.next();
    return !other.done && isSame(value, other.value);
  });
};

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

// The ids of the rows an item draws.
function rowIds(item: FeedViewItem): string[] {
  if (item.type === 'group') return item.items.flatMap(rowIds);
  if (item.type === 'exploration') return item.toolCalls.map((row) => row.id);
  return [item.row.id];
}

// Groups and explorations, with the explorations inside groups.
function collapsibles(items: readonly FeedViewItem[]): FeedViewItem[] {
  return items.flatMap((item) => {
    if (item.type === 'group')
      return [item, ...item.items.filter(({ type }) => type === 'exploration')];
    return item.type === 'exploration' ? [item] : [];
  });
}

// An older page can bring a group's first rows, so a group or exploration that holds a row its previous one was keyed by keeps that key.
function keepKeys(
  previous: FeedView,
  items: readonly FeedViewItem[],
): FeedViewItem[] {
  const previousKeys = new Set(collapsibles(previous.items).map(itemKey));
  const keepKey = <Item extends FeedViewItem>(item: Item): Item => {
    if (item.type !== 'group' && item.type !== 'exploration') return item;
    const keptId = rowIds(item).find((id) =>
      previousKeys.has(`${item.type}:${id}`),
    );
    const withKey =
      keptId === undefined || keptId === item.id
        ? item
        : { ...item, id: keptId };
    return withKey.type === 'group'
      ? { ...withKey, items: withKey.items.map(keepKey) }
      : withKey;
  };
  return items.map(keepKey);
}

// The new view with each unchanged item swapped for its previous object, so memoised rows skip their render.
export function keepUnchangedItems(
  previous: FeedView | null,
  next: FeedView,
): FeedView {
  if (!previous) return next;
  const nextItems = keepKeys(previous, next.items);
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
          ? previousActivity
          : activity;
      }),
    };
  };
  return { ...next, items: nextItems.map(keepIfUnchanged) };
}

const itemKey = (item: FeedViewItem): string =>
  `${item.type}:${feedItemKey(item)}`;

const toKeyedEntry = <Item extends FeedViewItem>(
  item: Item,
): readonly [string, Item] => [itemKey(item), item];
