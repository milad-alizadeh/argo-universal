import type { ListPage } from '@repo/contracts/plugins/loader-page-api';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { listReader, type DrawLists, type DrawReader } from './query-reads';

// One page of the list read from its cursor, through Argo's Queries; `fresh` reads it again whatever is kept.
export type ReadPage<Item> = (
  cursor: string | null,
  fresh: boolean,
) => Promise<ListPage<Item>>;

// One page read from its cursor, and whether it is the list's first.
type ReadFrom<Item> = (
  cursor: string | null,
  first: boolean,
) => Promise<ListPage<Item>>;

export type Paged<Item> = { items: Item[]; hasMore: boolean; pages: number };

// The draw a paged list is read for, and how it reads its Queries.
type ListDraw = {
  event: Extract<PluginEvent, { type: 'draw' }>;
  read: DrawReader;
};

const none: Paged<never> = { items: [], hasMore: false, pages: 0 };

/*
 * The pages the App shows of a draw's paged list. While the draw runs, Argo can read a page from it, so
 * each page is a Query of the address and cursor.
 */
export async function drawnPaged<Item>(
  list:
    | ((cursor: string | null) => ListPage<Item> | Promise<ListPage<Item>>)
    | undefined,
  { event, read }: ListDraw,
  lists: DrawLists,
): Promise<Paged<Item>> {
  if (!list) return none;

  lists.set(event.id, list);

  try {
    return await readPaged(event, listReader<Item>(read, event));
  } finally {
    lists.delete(event.id);
  }
}

/*
 * Up to `pages` pages of one Loader page's paged list, each read from the cursor the page before answered
 * (ADR-0050). Argo keeps every page as a Query of its address and cursor, so a page it kept answers at
 * once and a load more reads only the page it lacks. A pull reads the first page fresh. The App says how
 * many pages it shows; the worker never decides that.
 */
async function readPaged<Item>(
  { pages, pull }: Pick<ListDraw['event'], 'pages' | 'pull'>,
  readPage: ReadPage<Item>,
): Promise<Paged<Item>> {
  // Only the first page of a pull is read fresh.
  const reading: ReadFrom<Item> = (cursor, first) =>
    readPage(cursor, first && pull === true);

  return joined(await further([], pages, reading));
}

async function further<Item>(
  read: ListPage<Item>[],
  pages: number,
  readPage: ReadFrom<Item>,
): Promise<ListPage<Item>[]> {
  const page = await readPage(cursorAfter(read), read.length === 0);
  const all = [...read, page];

  return page.cursor === null || all.length >= pages
    ? all
    : further(all, pages, readPage);
}

const cursorAfter = <Item>(read: ListPage<Item>[]): string | null =>
  read.at(-1)?.cursor ?? null;

const joined = <Item>(read: ListPage<Item>[]): Paged<Item> => ({
  items: distinct(read.flatMap((page) => page.items)),
  hasMore: cursorAfter(read) !== null,
  pages: read.length,
});

// An item equal to one already listed is dropped, so a cursor may include the boundary item.
function distinct<Item>(items: Item[]): Item[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const json = JSON.stringify(item);
    const fresh = !seen.has(json);

    seen.add(json);

    return fresh;
  });
}
