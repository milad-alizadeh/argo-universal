import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('the view switcher shows Open and Closed Issues', async ({ mount }) => {
  const page = await mount({ page: '/views', surface: { platform: 'web' } });
  assert.equal((await page.find('Open Issue')).type, 'Text');
  const switcher = await page.find('Issue view');
  assert.equal(switcher.type, 'SegmentedControl');
  const entry = page.findText('Issue view');
  assert.ok(entry);
  await page.dispatch({
    key: entry.key,
    event: 'onValueChange',
    payload: 'closed',
  });
  assert.equal((await page.find('Closed Issue')).type, 'Text');
  assert.equal(page.findText('Open Issue'), undefined);
});
