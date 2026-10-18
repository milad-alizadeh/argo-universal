import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('pressing Tap me updates the hello page', async ({ mount }) => {
  const page = await mount({
    page: '/',
    surface: {
      platform: 'web',
      parts: {
        Column: 1,
        Text: 3,
        ActionList: 1,
        'ActionList.Section': 1,
        Action: 1,
        Pill: 1,
        ListItem: 1,
      },
    },
  });

  assert.equal((await page.find('Tapped 0 times')).type, 'Text');
  await page.press('Tap me');
  assert.equal((await page.find('Tapped 1 times')).type, 'Text');
});
