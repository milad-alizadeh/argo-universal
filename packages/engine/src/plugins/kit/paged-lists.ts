import type { ListPage } from '@repo/contracts/plugins/loader-page-api';
import { maxPages } from '@repo/contracts/plugins/page-draw';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { runtimeError } from '../protocol/runtime-status';
import { listReader, type DrawReader } from './draw-reads';
import type { DrawLists } from './query-reads';

type ReadListPage<Item> = Extract<ListPage<Item>, { cursor: string | null }>;

// One page of the list read from its cursor, through Argo's Queries; `fresh` reads it again whatever is kept.
export type ReadPage<Item> = (
  cursor: string | null,
  fresh: boolean,
) => Promise<ReadListPage<Item>>;

// A failure counts as an attempted page so a redraw still shows it and a retry can ask for it again.
export type Paged<Item> = {
  items: Item[];
  hasMore: boolean;
  pages: number;
  failed?: string;
};

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
  { pages, pull, retry }: Pick<ListDraw['event'], 'pages' | 'pull' | 'retry'>,
  readPage: ReadPage<Item>,
): Promise<Paged<Item>> {
  const first = await readPage(null, pull === true);

  const next = (cursor: string, at: number): Promise<ReadListPage<Item>> =>
    readPage(cursor, retry === true && at === pages - 1);

  return readFurther([first], pages, next);
}

type ReadFurther<Item> = (
  cursor: string,
  at: number,
) => Promise<ReadListPage<Item>>;

async function readFurther<Item>(
  read: ReadListPage<Item>[],
  pages: number,
  next: ReadFurther<Item>,
): Promise<Paged<Item>> {
  const cursor = cursorWithin(read, pages);

  if (cursor === null) return joined(read);

  const result = await next(cursor, read.length).catch(runtimeError);

  return typeof result === 'string'
    ? failedAfter(read, result)
    : readFurther([...read, result], pages, next);
}

const failedAfter = <Item>(
  read: ReadListPage<Item>[],
  failed: string,
): Paged<Item> => ({
  ...joined(read),
  hasMore: false,
  pages: read.length + 1,
  failed,
});

const cursorWithin = <Item>(
  read: ReadListPage<Item>[],
  pages: number,
): string | null => (read.length < pages ? cursorAfter(read) : null);

const cursorAfter = <Item>(read: ReadListPage<Item>[]): string | null =>
  read.at(-1)?.cursor ?? null;

// A list stops offering more at `maxPages`, the most pages an address can ask for.
const joined = <Item>(read: ReadListPage<Item>[]): Paged<Item> => ({
  items: distinct(read.flatMap((page) => page.items)),
  hasMore: cursorAfter(read) !== null && read.length < maxPages,
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
