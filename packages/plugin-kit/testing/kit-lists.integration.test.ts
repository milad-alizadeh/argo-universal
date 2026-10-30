import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginTest, PluginTestView } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';
import { kitListsSource } from '../mocks/kit-lists-source';

const surface = { platform: 'web' as const };

function keyOf(page: PluginTestView, label: string): string {
  const entry = page.findText(label);

  if (!entry) throw new Error(`Plugin node not found: ${label}`);

  return entry.key;
}

async function start(): Promise<PluginTest> {
  const fixture = await dataFixture(kitListsSource);
  await mkdir(join(fixture.directory, 'assets'));
  // The Server takes a file's format from its extension, so placeholder bytes are enough.
  await writeFile(join(fixture.directory, 'assets', 'poster.jpeg'), 'poster');

  return fixture.start({ clockStart: 0 });
}

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
}, 20_000);

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
}, 20_000);

it('appends another keyed line to an end-anchored log', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/log', surface });
  await page.find('Line 80');
  expect(page.findText('Line 81')).toBeUndefined();
  await page.press('Append line');
  expect((await page.find('Line 81')).type).toBe('Text');
}, 20_000);

it('loads another page of a paged list when Argo asks for more', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/paged', surface });
  await page.find('Post 3');
  expect(page.findText('Post 4')).toBeUndefined();
  await page.dispatch({ key: keyOf(page, 'Posts'), event: 'onLoadMore' });
  await kit.clock.advance(0);
  await page.find('Post 6');
  expect(page.findText('Post 3')).toBeDefined();
}, 20_000);
