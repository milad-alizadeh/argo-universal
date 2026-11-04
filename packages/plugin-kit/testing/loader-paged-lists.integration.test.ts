import type { WireJson } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import {
  issuesPath,
  listed,
  start,
  treeOf,
  type Kit,
} from './loader-page-fixture';

it('reads only the next page for a load more, and answers only its rows', async () => {
  const kit = await start();

  const first = treeOf(await kit.pages.draw({ path: issuesPath }));

  const more = await kit.pages.draw({
    path: issuesPath,
    pages: 2,
    known: first.hash,
  });

  expect(more).toMatchObject({
    kind: 'append',
    pages: 2,
    append: { at: [{ index: 0 }], props: { pagination: { hasMore: true } } },
  });
  expect(
    more.kind === 'append' && more.append.rows.map((row) => row.key),
  ).toEqual(['3', '4']);
  expect(await listed(kit)).toBe('null,2');

  const again = await kit.pages.draw({
    path: issuesPath,
    pages: 2,
    known: more.kind === 'append' ? more.hash : '',
  });

  expect(again.kind).toBe('unchanged');

  // A draw that is not a pull reads the pages Argo kept, and a redraw with nothing new is unchanged.
  const back = await kit.pages.draw({ path: issuesPath, pages: 1 });

  expect(back.kind).toBe('tree');
  expect(await listed(kit)).toBe('null,2');

  // A pull reads the first page again, and the pages after it that Argo kept answer at once.
  const pulled = await kit.pages.draw({
    path: issuesPath,
    pages: 2,
    pull: true,
  });

  expect(pulled.kind).toBe('tree');
  expect(await listed(kit)).toBe('null,2,null');
});

it('shares one named read between the pages reading it, until a write makes it due', async () => {
  const kit = await start();

  const title = async (path: string): Promise<string> => {
    const shown = treeOf(await kit.pages.draw({ path })).root.props.title;

    return typeof shown === 'string' ? shown : '';
  };

  expect(await title('/counted')).toBe('1');
  expect(await title('/counted-too')).toBe('1');

  await kit.pages.run({ operation: 'close', args: { number: 1 } });

  expect(await title('/counted-too')).toBe('2');
});

it('runs a declared Operation, marks every Loader page stale and reads the shown pages again', async () => {
  const kit = await start();

  await kit.pages.draw({ path: issuesPath, pages: 2 });

  const run = await kit.pages.run({ operation: 'close', args: { number: 3 } });

  expect(run).toEqual({ result: { closed: 3 } });

  const { root } = treeOf(await kit.pages.draw({ path: issuesPath, pages: 2 }));

  expect(root.children[0]?.children[2]?.props.finished).toBe(true);
  expect(await listed(kit)).toBe('null,2,null,2');
});

type Shown = { keys: string[]; pagination: WireJson | undefined };

const shown = (answer: Awaited<ReturnType<Kit['pages']['draw']>>): Shown => {
  const { props, children } = treeOf(answer).root;

  return { keys: children.map(({ key }) => key), pagination: props.pagination };
};

it('drops the item a cursor repeats at a page boundary, and has no more once a page comes back short', async () => {
  const kit = await start();

  const three = shown(await kit.pages.draw({ path: '/inclusive', pages: 3 }));

  expect(three).toMatchObject({
    keys: ['7', '6', '5', '4', '3', '2', '1'],
    pagination: { hasMore: true },
  });

  const four = shown(await kit.pages.draw({ path: '/inclusive', pages: 4 }));

  expect(four).toMatchObject({
    keys: ['7', '6', '5', '4', '3', '2', '1'],
    pagination: { hasMore: false },
  });
});

it('keeps each address its own pages', async () => {
  const kit = await start();

  await kit.pages.draw({ path: issuesPath, pages: 2 });
  await kit.pages.draw({ path: '/projects/site/issues', pages: 2 });

  // The second address reads its second page itself rather than the first address's.
  expect(await listed(kit)).toBe('null,2,null,2');
});

it('stops offering a load more at the most pages an address can ask for', async () => {
  const kit = await start();

  const last = treeOf(await kit.pages.draw({ path: '/endless', pages: 50 }));

  expect(last.root.props.pagination).toMatchObject({
    hasMore: false,
  });
});

it('keeps a paged list read for one App apart from the same list read for another', async () => {
  const kit = await start();

  const titles = async (app: {
    platform?: 'web' | 'ios';
    serverDevice?: boolean;
  }): Promise<unknown[]> =>
    treeOf(await kit.pages.draw({ path: '/by-app', ...app })).root.children.map(
      (row) => row.props.title,
    );

  expect(await titles({ platform: 'web', serverDevice: true })).toEqual([
    'web on the Server',
  ]);
  expect(await titles({ platform: 'ios' })).toEqual(['ios']);
  expect(await titles({ platform: 'web' })).toEqual(['web']);
});
