import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('the log appends another keyed line', async ({ mount }) => {
  const page = await mount({ page: '/log', surface: { platform: 'web' } });
  await page.find('Line 80');
  await page.press('Append line');
  assert.equal((await page.find('Line 81')).type, 'Text');
});
