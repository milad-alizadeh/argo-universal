import type { ListPage } from '@repo/contracts/plugins/loader-page-api';

// One page read from its cursor: its items, the cursor of the page after it, and when its read started.
type Kept<Item> = { page: ListPage<Item>; at: number };

// When the Plugin last wrote: shared by every page's list, since a write may change any of them.
export type Forgets = { at: number; now: () => number };

export const forgets = (now: () => number = Date.now): Forgets => ({
  at: 0,
  now,
});

// A write makes stale every page whose read started before it.
export function forget(marks: Forgets): void {
  marks.at = marks.now() + 1;
}

// Pages are kept this long, so a further page costs one read however many came before.
const keptMs = 60_000;

export type ReadPage<Item> = (cursor: string | null) => Promise<ListPage<Item>>;

export type Paged<Item> = { items: Item[]; hasMore: boolean; pages: number };

/*
 * The pages of one Loader page's paged list the worker has read, by Page address and cursor (ADR-0050).
 * `read` answers up to `pages` pages joined: one page is a pull, so it is read again; more come from what is
 * kept, the stale ones read again at once from their known cursors, and only pages past those wait on the page
 * before for theirs. A page is as old as its read's start, so `forget` makes stale every page whose read started
 * before it, even one still in flight. The App says how many pages it shows; the worker never decides that.
 */
export class PagedList<Item> {
  private readonly kept = new Map<string, Kept<Item>>();

  public constructor(private readonly marks: Forgets) {}

  public async read(
    address: string,
    pages: number,
    readPage: ReadPage<Item>,
  ): Promise<Paged<Item>> {
    this.prune();

    const source: Source<Item> = { address, pages, readPage };
    const known = this.knownCursors(source);

    const read = await Promise.all(
      known.map((cursor) => this.pageAt(source, cursor)),
    );

    return joined(await this.further(source, read));
  }

  // The first page's cursor, then each kept page's next one, as far as the pages asked for.
  private knownCursors({ address, pages }: Source<Item>): (string | null)[] {
    const cursors: (string | null)[] = [null];
    let next = this.nextOf(address, null);

    while (next !== null && cursors.length < pages) {
      cursors.push(next);
      next = this.nextOf(address, next);
    }

    return cursors;
  }

  private nextOf(address: string, cursor: string | null): string | null {
    return this.kept.get(keyOf(address, cursor))?.page.cursor ?? null;
  }

  private pageAt(
    source: Source<Item>,
    cursor: string | null,
  ): Promise<ListPage<Item>> {
    return source.pages > 1
      ? this.keptPage(source, cursor)
      : this.freshPage(source, cursor);
  }

  // Pages past the known ones wait on the one before for their cursor.
  private async further(
    source: Source<Item>,
    read: ListPage<Item>[],
  ): Promise<ListPage<Item>[]> {
    const next = cursorAfter(read);

    if (next === null || read.length >= source.pages) return read;

    return this.further(source, [...read, await this.keptPage(source, next)]);
  }

  private keptPage(
    source: Source<Item>,
    cursor: string | null,
  ): Promise<ListPage<Item>> {
    const hit = this.kept.get(keyOf(source.address, cursor));

    if (hit && this.fresh(hit)) return Promise.resolve(hit.page);

    return this.freshPage(source, cursor);
  }

  private async freshPage(
    { address, readPage }: Source<Item>,
    cursor: string | null,
  ): Promise<ListPage<Item>> {
    const at = this.marks.now();
    const page = await readPage(cursor);

    this.kept.set(keyOf(address, cursor), { page, at });

    return page;
  }

  private fresh({ at }: Kept<Item>): boolean {
    return at >= this.marks.at && this.marks.now() - at < keptMs;
  }

  private prune(): void {
    const now = this.marks.now();

    for (const [key, { at }] of this.kept)
      if (now - at >= keptMs) this.kept.delete(key);
  }
}

type Source<Item> = {
  address: string;
  pages: number;
  readPage: ReadPage<Item>;
};

const keyOf = (address: string, cursor: string | null): string =>
  `${address}\n${cursor ?? ''}`;

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
