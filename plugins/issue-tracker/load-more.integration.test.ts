import { expect, it } from 'vitest';
import { signedInRoot } from './journey-fixture';

it('appends Issues with the same creation timestamp and stops at the last page', async () => {
  const { root } = await signedInRoot();
  const page = await root.press('Assigned to you');

  expect(page.findText('Imported Issue 101')).toBeDefined();
  expect(page.findText('Imported Issue 100')).toBeUndefined();

  await page.loadMore();

  expect(page.findText('Imported Issue 101')).toBeDefined();
  expect(page.findText('Imported Issue 100')).toBeDefined();
  expect(
    page.find(
      (node) => node.type === 'List' && node.props.pagination !== undefined,
    ).props.pagination,
  ).toMatchObject({ hasMore: false });
}, 20_000);
