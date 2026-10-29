// Where a page starts and how much it holds; each is the caller's, or the default of what is paged.
export type ChangesPage = { cursor?: number; limit?: number };

// The files in a page of changed files, and the lines in a page of one file's diff, unless the caller asks for more.
export const defaultFilesLimit = 50;

export const defaultPatchLimit = 400;

type ItemsPage<Item> = { items: Item[]; nextCursor: number | null };

export type PageWindow = { cursor: number; limit: number };

export const pageWindow = (
  page: ChangesPage,
  defaultLimit: number,
): PageWindow => ({
  cursor: page.cursor ?? 0,
  limit: page.limit ?? defaultLimit,
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
