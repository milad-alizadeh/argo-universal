import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('the gallery shows a thumbnail shelf and selectable Svg wall', async ({
  mount,
}) => {
  const page = await mount({ page: '/gallery', surface: { platform: 'web' } });
  const thumbnail = await page.find('Overview preview');
  assert.equal(thumbnail.type, 'Image');
  assert.partialDeepStrictEqual(thumbnail.props, {
    source: { format: 'jpeg' },
  });
  const metric = await page.find('Metric 2');
  assert.equal(metric.type, 'ListItem');
  await page.press('Metric 2');
  await page.waitFor(
    () => page.findText('Metric 2')?.node.props.selected === true,
  );
  assert.equal((await page.find('Metric 2')).props.selected, true);
  assert.equal((await page.find('Metric 1')).props.selected, false);
  assert.equal((await page.find('Metric 1 trend')).type, 'Svg');
});
