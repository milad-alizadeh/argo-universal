import type { FeedViewItem, ParentResult } from './feed-view';

type Positioned = { position: number };

const ownRow = (item: FeedViewItem): Positioned[] =>
  'row' in item ? [item.row] : [];

// The child rows an item draws; a Subagent row carries none, so a result never lands before it.
function rowsOf(item: FeedViewItem): Positioned[] {
  if (item.type === 'group') return item.items.flatMap(rowsOf);

  if (item.type === 'exploration') return item.toolCalls;

  return ownRow(item);
}

const firstPosition = (item: FeedViewItem): number | undefined =>
  rowsOf(item)[0]?.position;

// Where a result draws: before the first child item written at or after its position, else after them all.
function slotOf(items: readonly FeedViewItem[], result: ParentResult): number {
  const { childPosition } = result;

  if (childPosition === undefined) return items.length;

  const slot = items.findIndex(
    (item) => (firstPosition(item) ?? -1) >= childPosition,
  );

  return slot === -1 ? items.length : slot;
}

/*
 * The child's Feed with the parent's reports drawn where they arrived (#1981). Parent and child positions
 * are separate number spaces, so each report is placed by the child position the Engine recorded with it.
 */
export function withParentResults(
  items: readonly FeedViewItem[],
  results: readonly ParentResult[],
): FeedViewItem[] {
  const slots = results.map((result) => slotOf(items, result));

  const at = (slot: number): ParentResult[] =>
    results.filter((_, index) => slots[index] === slot);

  return [
    ...items.flatMap((item, slot) => [...at(slot), item]),
    ...at(items.length),
  ];
}
