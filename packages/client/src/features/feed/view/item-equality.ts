import type { FeedExploration, FeedGroup, FeedViewItem } from './feed-view';

export function sameList<Value>(
  first: readonly Value[],
  second: readonly Value[],
  isSame: (first: Value, second: Value) => boolean = Object.is,
): boolean {
  if (first.length !== second.length) return false;
  const following = second.values();

  return first.every((value) => {
    const other = following.next();

    return !other.done && isSame(value, other.value);
  });
}

function sameHeader(
  first: FeedGroup | FeedExploration,
  second: FeedGroup | FeedExploration,
): boolean {
  return first.id === second.id && first.title === second.title;
}

function sameGroupContent(first: FeedGroup, second: FeedGroup): boolean {
  return sameHeader(first, second) && sameGroupItems(first, second);
}

function sameGroupItems(first: FeedGroup, second: FeedGroup): boolean {
  return (
    first.state === second.state &&
    sameList<FeedViewItem>(first.items, second.items, sameItem)
  );
}

function sameGroup(first: FeedViewItem, second: FeedViewItem): boolean {
  if (first.type !== 'group') return false;

  if (second.type !== 'group') return false;

  return sameGroupContent(first, second);
}

function sameExplorationContent(
  first: FeedExploration,
  second: FeedExploration,
): boolean {
  return (
    sameHeader(first, second) && sameList(first.toolCalls, second.toolCalls)
  );
}

function sameExploration(first: FeedViewItem, second: FeedViewItem): boolean {
  if (first.type !== 'exploration') return false;

  if (second.type !== 'exploration') return false;

  return sameExplorationContent(first, second);
}

function sameRow(first: FeedViewItem, second: FeedViewItem): boolean {
  if (!('row' in first)) return false;

  if (!('row' in second)) return false;

  return first.row === second.row;
}

function sameContents(first: FeedViewItem, second: FeedViewItem): boolean {
  return (
    sameGroup(first, second) ||
    sameExploration(first, second) ||
    sameRow(first, second)
  );
}

export function sameItem(first: FeedViewItem, second: FeedViewItem): boolean {
  if (first === second) return true;

  if (first.type !== second.type) return false;

  return sameContents(first, second);
}
