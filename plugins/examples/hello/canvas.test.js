import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

const parts = {
  Page: 1,
  Stack: 1,
  Text: 3,
  Action: 4,
  Canvas: 1,
  'Canvas.Rect': 1,
  'Canvas.Circle': 1,
  'Canvas.Line': 1,
  'Canvas.Path': 1,
  'Canvas.Text': 1,
  'Canvas.Group': 1,
};

for (const platform of ['ios', 'android', 'desktop']) {
  test(`Canvas JSX draws a heatmap and code map on ${platform}`, async ({
    mount,
    clock,
  }) => {
    const page = await mount({ page: '/canvas', surface: { platform, parts } });
    assert.equal((await page.find('Day 0')).type, 'Canvas.Rect');
    assert.equal((await page.find('packages/file-1.ts')).type, 'Canvas.Rect');
    await page.press('packages/file-1.ts');
    await clock.advance(16);
    await page.waitFor(
      () =>
        canvases(page.tree).find((node) => node.props.label === 'Project files')
          .props.selectedKey === 'packages-1',
    );
  });
}

test('one changed heatmap shape sends one keyed patch', async ({
  mount,
  clock,
}) => {
  const page = await mount({
    page: '/canvas',
    surface: { platform: 'desktop', parts },
  });

  await page.find('Day 44: 6 builds');
  await page.press('Change one shape');
  await clock.advance(16);
  await page.find('Day 44: 12 builds');
  const message = page.message;
  assert.equal(message.type, 'patch');
  assert.equal(message.ops.length, 1);
  const [op] = message.ops;
  assert.equal(op.op, 'setProps');
  assert.equal(op.key.at(-1), 'day-44');
  assert.equal(op.props.intensity, 1);
  assert.equal(op.props.label, 'Day 44: 12 builds');
  assert.equal(Object.keys(op.props).length, 2);
});

function canvases(node) {
  if (node.type === 'Canvas') return [node];

  return node.children.flatMap(canvases);
}
