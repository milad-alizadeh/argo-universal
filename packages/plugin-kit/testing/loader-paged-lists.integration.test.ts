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

  // A pull draws one page, read again from the first.
  await kit.pages.draw({ path: issuesPath, pages: 1 });
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
