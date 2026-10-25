import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

// Argo reports the new sort; the page re-sorts its runs.
test('the runs Screen sorts its table of runs', async ({ mount, clock }) => {
  const page = await mount({
    page: '/runs',
    surface: { platform: 'web' },
  });

  assert.equal((await page.find('CI runs')).type, 'Table');
  assert.equal((await page.find('Build iOS')).type, 'Table.Cell');

  const firstRun = (): string =>
    JSON.stringify(page.findText('CI runs')?.node.children[0]?.props.id);

  assert.equal(firstRun(), JSON.stringify('typecheck'));

  const table = page.findText('CI runs');

  assert.ok(table);
  await page.dispatch({
    key: table.key,
    event: 'onSortChange',
    payload: { column: 'started', direction: 'descending' },
  });

  while (firstRun() !== JSON.stringify('lint')) await clock.advance(0);
});
