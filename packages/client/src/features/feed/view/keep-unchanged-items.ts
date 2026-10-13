import { type FeedView, type FeedViewItem, feedItemKey } from './feed-view';
import { sameItem } from './item-equality';

type Collapsible = Extract<FeedViewItem, { type: 'group' | 'exploration' }>;

const isCollapsible = (item: FeedViewItem): item is Collapsible =>
  item.type === 'group' || item.type === 'exploration';

const itemKey = (item: FeedViewItem): string =>
  `${item.type}:${feedItemKey(item)}`;

const toKeyedEntry = <Item extends FeedViewItem>(
  item: Item,
): readonly [string, Item] => [itemKey(item), item];

function rowIds(item: FeedViewItem): string[] {
  if (item.type === 'group') return item.items.flatMap(rowIds);

  if (item.type === 'exploration') return item.toolCalls.map((row) => row.id);

  return [item.row.id];
}

function collapsibles(items: readonly FeedViewItem[]): Collapsible[] {
  return items.flatMap(nestedCollapsibles);
}

function nestedCollapsibles(item: FeedViewItem): Collapsible[] {
  if (item.type === 'group')
    return [
      item,
      ...item.items.filter((activity) => activity.type === 'exploration'),
    ];

  return item.type === 'exploration' ? [item] : [];
}

function withKeptId<Item extends Collapsible>(
  item: Item,
  keptId: string | undefined,
): Item {
  return keptId === undefined || keptId === item.id
    ? item
    : { ...item, id: keptId };
}

function keepIfSame<Item extends FeedViewItem>(
  item: Item,
  previous: Item | undefined,
): Item {
  if (previous && sameItem(previous, item)) return previous;

  return item;
}

class ItemKeeper {
  private readonly previousKeys: Set<string>;
  private readonly previousItems: Map<string, FeedViewItem>;

  public constructor(previous: FeedView) {
    this.previousKeys = new Set(collapsibles(previous.items).map(itemKey));
    this.previousItems = new Map(previous.items.map(toKeyedEntry));
  }

  private keepKey<Item extends FeedViewItem>(item: Item): Item {
    if (!isCollapsible(item)) return item;

    const keptId = rowIds(item).find((id) =>
      this.previousKeys.has(`${item.type}:${id}`),
    );

    const withKey = withKeptId(item, keptId);

    return withKey.type === 'group'
      ? {
          ...withKey,
          items: withKey.items.map((activity) => this.keepKey(activity)),
        }
      : withKey;
  }

  private keepItem(item: FeedViewItem): FeedViewItem {
    const previousItem = this.previousItems.get(itemKey(item));
    const kept = keepIfSame(item, previousItem);

    if (kept !== item) return kept;

    return this.keepGroupActivities(item, previousItem);
  }

  private keepGroupActivities(
    item: FeedViewItem,
    previous: FeedViewItem | undefined,
  ): FeedViewItem {
    if (item.type !== 'group') return item;

    if (!previous) return item;

    return this.keepActivities(item, previous);
  }

  private keepActivities(
    item: Extract<FeedViewItem, { type: 'group' }>,
    previous: FeedViewItem,
  ): FeedViewItem {
    if (previous.type !== 'group') return item;
    const previousActivities = new Map(previous.items.map(toKeyedEntry));

    return {
      ...item,
      items: item.items.map((activity) =>
        keepIfSame(activity, previousActivities.get(itemKey(activity))),
      ),
    };
  }

  public keep(items: readonly FeedViewItem[]): FeedViewItem[] {
    return items.map((item) => this.keepItem(this.keepKey(item)));
  }
}

export function keepUnchangedItems(
  previous: FeedView | null,
  next: FeedView,
): FeedView {
  if (!previous) return next;

  return { ...next, items: new ItemKeeper(previous).keep(next.items) };
}
