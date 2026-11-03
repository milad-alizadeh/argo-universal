import type { ListPage } from '@repo/contracts/plugins/loader-page-api';
import { expect, it } from 'vitest';
import { forget, forgets, PagedList, type ReadPage } from './paged-lists';

const size = 3;

/*
 * Items count..1, newest first; a cursor is the last item of a full page and the next page starts at it, inclusive,
 * as the tracker's `created:<=` does. Each read is logged and may be held open until `release`.
 */
type Source = {
  read: ReadPage<number>;
  cursors: (string | null)[];
  most: () => number;
  hold: () => () => void;
};

function source(count: number): Source {
  const cursors: (string | null)[] = [];
  let reading = 0;
  let most = 0;
  let gate: Promise<void> | null = null;

  const read: ReadPage<number> = async (cursor) => {
    cursors.push(cursor);
    reading += 1;
    most = Math.max(most, reading);
    await (gate ?? Promise.resolve());
    reading -= 1;

    return pageFrom(count, cursor);
  };

  const hold = (): (() => void) => {
    const { promise, resolve } = Promise.withResolvers<void>();

    gate = promise;

    return () => {
      gate = null;
      resolve();
    };
  };

  return { read, cursors, most: () => most, hold };
}

function pageFrom(count: number, cursor: string | null): ListPage<number> {
  const top = cursor === null ? count : Number(cursor);

  const items = Array.from({ length: size }, (_, index) => top - index).filter(
    (item) => item > 0,
  );

  return {
    items,
    cursor: items.length === size ? String(items.at(-1)) : null,
  };
}

const list = (): PagedList<number> => new PagedList(forgets());

it('reads one page more for each further page, joining them without the repeat at the boundary', async () => {
  const paged = list();
  const { read, cursors } = source(20);

  const two = await paged.read('a', 2, read);

  expect(two).toEqual({ items: [20, 19, 18, 17, 16], hasMore: true, pages: 2 });

  cursors.length = 0;
  const three = await paged.read('a', 3, read);

  // The first two pages come from what was kept; only the third is read.
  expect(cursors).toEqual(['16']);
  expect(three.items).toEqual([20, 19, 18, 17, 16, 15, 14]);
});

it('reads the first page again for a pull, which asks for one page', async () => {
  const paged = list();
  const { read, cursors } = source(20);

  await paged.read('a', 2, read);
  cursors.length = 0;
  await paged.read('a', 1, read);

  expect(cursors).toEqual([null]);
});

it('has no more once a page comes back short', async () => {
  const { read } = source(size - 1);

  expect(await list().read('a', 1, read)).toEqual({
    items: [2, 1],
    hasMore: false,
    pages: 1,
  });
});

it('keeps each address its own pages', async () => {
  const paged = list();
  const { read, cursors } = source(20);

  await paged.read('a', 2, read);
  cursors.length = 0;
  await paged.read('b', 2, read);

  expect(cursors).toEqual([null, '18']);
});

it('reads every shown page again at once after a write, from the cursors it already has', async () => {
  const marks = forgets();
  const paged = new PagedList<number>(marks);
  const { read, cursors, most } = source(20);

  await paged.read('a', 3, read);
  forget(marks);
  cursors.length = 0;

  const again = await paged.read('a', 3, read);

  expect(cursors).toEqual([null, '18', '16']);
  expect(most()).toBe(3);
  expect(again.items).toHaveLength(7);
});

it('reads a page again when a write overtook its read, even after it landed', async () => {
  let now = 0;
  const marks = forgets(() => now);
  const paged = new PagedList<number>(marks);
  const { read, cursors, hold } = source(20);

  await paged.read('a', 1, read);
  now = 1;
  const release = hold();
  const overtaken = paged.read('a', 2, read);

  now = 2;
  forget(marks);
  now = 10;
  release();
  await overtaken;
  cursors.length = 0;
  await paged.read('a', 2, read);

  // Dated by when it landed, the second page would pass as fresh.
  expect(cursors).toEqual([null, '18']);
});
