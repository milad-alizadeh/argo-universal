import { expect, it } from 'vitest';
import { issuesPath, start, titlesOf, treeOf } from './loader-page-fixture';

it('draws a Loader page at its address, with the Page state over its defaults', async () => {
  const kit = await start();

  const first = await kit.pages.draw({ path: issuesPath });

  expect(first).toMatchObject({
    kind: 'tree',
    pages: 1,
    root: { type: 'Screen', props: { title: 'argo', value: '' } },
  });
  expect(titlesOf(first)).toEqual(['Issue 1', 'Issue 2']);

  const found = await kit.pages.draw({
    path: issuesPath,
    pageState: { query: '3' },
  });

  expect(titlesOf(found)).toEqual(['Issue 3']);
});

it('puts load more, Page state changes and bindings in the tree as values', async () => {
  const kit = await start();

  const { root } = treeOf(await kit.pages.draw({ path: issuesPath }));

  expect(root.props).toMatchObject({ onChangeText: { bind: 'query' } });
  expect(root.children[0]?.props).toMatchObject({
    pagination: { hasMore: true, onLoadMore: { loadMore: true } },
    onRefresh: { pageState: {} },
  });
  expect(root.children[0]?.children.map((row) => row.key)).toEqual(['1', '2']);
});

it('refuses an Operation call the manifest does not allow', async () => {
  const kit = await start();

  await expect(
    kit.pages.run({ operation: 'close', args: { number: 'two' } }),
  ).rejects.toThrow(/number/);
});

it('fails a draw whose Render calls a hook or passes a function', async () => {
  const kit = await start();

  expect(await kit.pages.draw({ path: '/hooks' })).toEqual({
    kind: 'failed',
    error: 'Uses calls a hook, and a Render is pure',
  });
  expect(await kit.pages.draw({ path: '/functions' })).toEqual({
    kind: 'failed',
    error: 'A Render passes values, not functions: onPress',
  });
});

it('fails a draw with what the Loader threw, or a path no page matches', async () => {
  const kit = await start();

  expect(await kit.pages.draw({ path: '/throws' })).toEqual({
    kind: 'failed',
    error: 'GitHub refused the read',
  });
  expect(await kit.pages.draw({ path: '/nowhere' })).toEqual({
    kind: 'failed',
    error: 'No Loader page at /nowhere',
  });
});
