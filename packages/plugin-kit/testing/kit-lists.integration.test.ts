import { expect, it } from 'vitest';
import { kitListsSource } from '../mocks/kit-lists-source';
import {
  keyOf,
  startKit,
  webSurface as surface,
} from '../mocks/kit-page-helpers';

const start = (): ReturnType<typeof startKit> =>
  startKit(kitListsSource, ['poster.jpeg']);

it('mounts the gallery shelf and selects a tile of the Svg wall', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/gallery', surface });
  await page.waitFor(
    () => page.findText('Overview preview')?.node.props.source !== undefined,
  );
  const thumbnail = await page.find('Overview preview');
  expect(thumbnail.type).toBe('Image');
  expect(thumbnail.props).toMatchObject({ source: { format: 'jpeg' } });
  expect((await page.find('Metric 2')).type).toBe('ListItem');
  expect((await page.find('Metric 1 trend')).type).toBe('Svg');
  await page.press('Metric 2');
  await page.waitFor(
    () => page.findText('Metric 2')?.node.props.selected === true,
  );
  expect(page.findText('Metric 1')?.node.props.selected).toBe(false);
});

it('moves a board card to another lane when Argo reports the move', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/board', surface });
  expect((await page.find('Fix login')).type).toBe('ListItem');

  const board = keyOf(page, 'Board');

  const laneOf = (title: string): string => {
    const lane = page
      .findText('Board')
      ?.node.children.find((candidate) =>
        candidate.children.some((card) => card.props.title === title),
      );

    return JSON.stringify(lane?.props.id);
  };

  expect(laneOf('Fix login')).toBe('"todo"');
  await page.dispatch({
    key: board,
    event: 'onMove',
    payload: { id: 'login', section: 'done', index: 0 },
  });
  await kit.clock.advance(0);
  await page.waitFor(() => laneOf('Fix login') === '"done"');
  expect(laneOf('Write docs')).toBe('"todo"');
});

it('appends another keyed line to an end-anchored log', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/log', surface });
  await page.find('Line 80');
  expect(page.findText('Line 81')).toBeUndefined();
  await page.press('Append line');
  expect((await page.find('Line 81')).type).toBe('Text');
});

it('loads another page of a paged list when Argo asks for more', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/paged', surface });
  await page.find('Post 3');
  expect(page.findText('Post 4')).toBeUndefined();
  await page.dispatch({ key: keyOf(page, 'Posts'), event: 'onLoadMore' });
  await kit.clock.advance(0);
  await page.find('Post 6');
  expect(page.findText('Post 3')).toBeDefined();
});
