import { expect, it } from 'vitest';
import { issuesPath, listed, start, treeOf } from './loader-page-fixture';

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
});

it('runs a declared Operation, answers every Loader page as stale and reads the shown pages again', async () => {
  const kit = await start();

  await kit.pages.draw({ path: issuesPath, pages: 2 });

  const run = await kit.pages.run({ operation: 'close', args: { number: 3 } });

  expect(run).toEqual({
    result: { closed: 3 },
    stale: [
      '/listed',
      '/projects/:project/issues',
      '/hooks',
      '/functions',
      '/throws',
    ],
  });

  const { root } = treeOf(await kit.pages.draw({ path: issuesPath, pages: 2 }));

  expect(root.children[0]?.children[2]?.props.finished).toBe(true);
  expect(await listed(kit)).toBe('null,2,null,2');
});
