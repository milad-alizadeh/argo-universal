export type PageInput = { cursor?: number; limit?: number };

export type PageWindow = { cursor: number; limit: number };

// One page of a list: the items in the window, and where the next page starts, if one does.
export type ItemsPage<Item> = { items: Item[]; nextCursor: number | null };

export const pageWindow = (
  input: PageInput,
  defaultLimit: number,
): PageWindow => ({
  cursor: input.cursor ?? 0,
  limit: input.limit ?? defaultLimit,
});

// The cursor is an offset, so a list that changes between requests can skip or repeat an item at a page edge.
export function pageItems<Item>(
  items: readonly Item[],
  { cursor, limit }: PageWindow,
): ItemsPage<Item> {
  const end = cursor + limit;

  return {
    items: items.slice(cursor, end),
    nextCursor: end < items.length ? end : null,
  };
}
