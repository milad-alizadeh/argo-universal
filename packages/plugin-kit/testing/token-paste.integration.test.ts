import { expect, it } from 'vitest';
import {
  borrowerId,
  itemsText,
  paste,
  secretFieldOf,
  start,
  tokenService,
} from './token-paste-fixture';

it('signs a throwaway Plugin in with a pasted token, from a paired Device, and reads as the person', async () => {
  const service = await tokenService({ 'token-1': 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, 'token-1');

  expect(page.findText(itemsText)).toBeDefined();
  expect(service.readTokens()).toEqual(['token-1']);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
  expect(await test.log()).not.toContain('token-1');
});

it('shows a token the service refuses as an error beside the field, and adds no Account', async () => {
  const service = await tokenService({ 'token-1': 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, 'wrong-token');

  expect(secretFieldOf(page)).toMatchObject({
    props: { error: expect.stringContaining('wasn’t accepted') },
  });
  expect(page.findText(itemsText)).toBeUndefined();
  expect(test.accounts.list()).toEqual([]);

  await paste(test, page, 'token-1');

  expect(page.findText(itemsText)).toBeDefined();
});

it('signs in again with a new token once the service refuses the kept one, and keeps one Account', async () => {
  const service = await tokenService({
    'token-1': 'person',
    'token-2': 'person',
  });

  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, 'token-1');
  service.revoke('token-1');
  await page.draw();

  expect(
    page.findText('api.service.example no longer accepts this sign-in.'),
  ).toBeDefined();

  await paste(test, page, 'token-2');

  expect(page.findText(itemsText)).toBeDefined();
  expect(service.readTokens()).toEqual(['token-1', 'token-1', 'token-2']);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
});

it('lends the pasted token to a second Plugin that borrows the Account, which never sees it', async () => {
  const service = await tokenService({ 'token-1': 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, 'token-1');

  await expect(
    test.operations.run({ name: 'readItems', pluginId: borrowerId }),
  ).resolves.toBe(itemsText);
  expect(service.readTokens()).toEqual(['token-1', 'token-1']);
  expect(await test.log(borrowerId)).not.toContain('token-1');
});
