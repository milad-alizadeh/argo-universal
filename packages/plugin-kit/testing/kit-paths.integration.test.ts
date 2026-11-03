import { expect, it } from 'vitest';
import { startKit, webSurface as surface } from '../mocks/kit-page-helpers';
import { kitPathsSource } from '../mocks/kit-paths-source';

const start = (): ReturnType<typeof startKit> => startKit(kitPathsSource);

it('opens a page registered at a pattern with the path segments it matched', async () => {
  const page = await (
    await start()
  ).mount({
    page: '/lists/inbox/items/7',
    surface,
  });

  expect((await page.find('Item 7 in inbox')).type).toBe('Text');
});

it('opens the exact path over a pattern that also matches it', async () => {
  const test = await start();
  const exact = await test.mount({ page: '/lists/inbox/items/new', surface });

  const patterned = await test.mount({
    page: '/lists/later/items/new',
    surface,
  });

  expect((await exact.find('New item form')).type).toBe('Text');
  expect((await patterned.find('Item new in later')).type).toBe('Text');
});

it('refuses a second pattern that matches the same paths as one already registered', async () => {
  const page = await (await start()).mount({ page: '/', surface });

  expect(
    (await page.find('/tags/:name matches the same paths as /tags/:tag')).type,
  ).toBe('Text');
});

it("says a path with no page doesn't exist, rather than drawing nothing", async () => {
  const page = await (await start()).mount({ page: '/lists', surface });

  expect((await page.find("This page doesn't exist")).type).toBe('EmptyState');
});
