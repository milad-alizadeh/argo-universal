import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

// Argo reports where a card lands; the board draws it in its new lane.
test('the board moves a card to another lane', async ({ mount, clock }) => {
  const page = await mount({ page: '/board', surface: { platform: 'web' } });

  assert.equal((await page.find('Fix login')).type, 'ListItem');

  const board = page.findText('Board');

  assert.ok(board);

  const laneOf = (title: string): string =>
    JSON.stringify(
      page
        .findText('Board')
        ?.node.children.find((lane) =>
          lane.children.some((card) => card.props.title === title),
        )?.props.id,
    );

  assert.equal(laneOf('Fix login'), JSON.stringify('todo'));
  await page.dispatch({
    key: board.key,
    event: 'onMove',
    payload: { id: 'login', section: 'done', index: 0 },
  });

  await clock.advance(0);
  // The redraw arrives as a patch; waiting for it fails the test once the view's limit passes without it.
  await page.waitFor(() => laneOf('Fix login') === JSON.stringify('done'));

  assert.equal(laneOf('Fix login'), JSON.stringify('done'));
});
