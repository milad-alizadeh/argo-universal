import type { PageView } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { issuesPath, start } from './loader-page-fixture';

const titles = (page: PageView): unknown[] =>
  page.tree.children[0]?.children.map((row) => row.props.title) ?? [];

const open = async (path = issuesPath): Promise<PageView> =>
  (await start()).pages.open({ path });

const isList = (node: { type: string }): boolean => node.type === 'List';

it('draws the address again for a bound search once the edits pause, as the App does', async () => {
  const kit = await start();
  const page = await kit.pages.open({ path: issuesPath });

  expect(titles(page)).toEqual(['Issue 1', 'Issue 2']);

  await page.act('argo', 'onChangeText', '3');
  await kit.clock.advance(299);

  expect(page.pageState).toEqual({});

  await kit.clock.advance(1);

  expect(page.pageState).toEqual({ query: '3' });
  expect(titles(page)).toEqual(['Issue 3']);
});

it('lands what was typed before a press runs its Operation, so the run takes the latest draft', async () => {
  const page = await open('/draft');

  await page.act('Draft', 'onChangeText', 'fix login');
  await page.press('Note');

  expect(page.pageState).toEqual({ title: 'fix login' });
  expect(page.find('Noted: fix login').type).toBe('ListItem');
});

it('appends the next page on load more, and a pull starts again from the first', async () => {
  const page = await open();

  await page.loadMore();
  expect(titles(page)).toEqual(['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4']);

  await page.act(isList, 'onRefresh');
  expect(titles(page)).toEqual(['Issue 1', 'Issue 2']);
});

it('runs an Operation for the page, then draws it again', async () => {
  const page = await open('/issue');

  expect(page.find('Open').type).toBe('ListItem');
  expect(await page.press('Open')).toBe(page);
  expect(page.find('Closed').type).toBe('ListItem');
});

it('opens the page a press navigates to', async () => {
  const page = await open('/issue');
  const listed = await page.press('Cursors');

  expect(listed.path).toBe('/listed');
  expect(listed).not.toBe(page);
});

it('rejects opening a page that fails to draw', async () => {
  const kit = await start();

  await expect(kit.pages.open({ path: '/throws' })).rejects.toThrow(
    'GitHub refused the read',
  );
});
