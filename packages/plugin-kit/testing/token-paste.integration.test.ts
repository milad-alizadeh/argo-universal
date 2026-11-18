import { expect, it } from 'vitest';
import {
  borrowerId,
  carelessId,
  fieldSectionOf,
  keeps,
  itemsText,
  paste,
  secretFieldOf,
  start,
  tokenService,
} from './token-paste-fixture';

// The token the fixture service accepts, and one it refuses.
const token = 'token-1-8f3a';

const wrongToken = 'wrong-token';

const notAccepted = 'This token wasn’t accepted. Check it and paste it again.';

it('signs a throwaway Plugin in with a pasted token, from a paired Device, and reads as the person', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  expect(secretFieldOf(page)).toBeDefined();
  expect(page.findText('Continue on the Server Device')).toBeUndefined();

  await paste(test, page, token);

  expect(page.findText(itemsText)).toBeDefined();
  expect(service.readTokens()).toEqual([token]);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
  expect(await test.log()).not.toContain(token);
});

it('shows a token the service refuses as an error beside the field, and adds no Account', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, wrongToken);

  expect(fieldSectionOf(page).props.footer).toBe(notAccepted);
  expect(secretFieldOf(page).props.error).toBe(notAccepted);
  expect(keeps(page, wrongToken)).toBe(false);
  expect(page.findText(itemsText)).toBeUndefined();
  expect(test.accounts.list()).toEqual([]);

  await paste(test, page, token);

  expect(page.findText(itemsText)).toBeDefined();
});

it('signs in again with a new token once the service refuses the kept one, and keeps one Account', async () => {
  const service = await tokenService({
    [token]: 'person',
    'token-2-c41d': 'person',
  });

  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, token);
  service.revoke(token);
  await page.draw();

  expect(
    page.findText('api.service.example no longer accepts this sign-in.'),
  ).toBeDefined();

  await paste(test, page, 'token-2-c41d');

  expect(page.findText(itemsText)).toBeDefined();
  expect(service.readTokens()).toEqual([token, token, 'token-2-c41d']);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
});

it('lends the pasted token to a second Plugin that borrows the Account, which never sees it', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, token);

  await expect(
    test.operations.run({ name: 'readItems', pluginId: borrowerId }),
  ).resolves.toBe(itemsText);
  expect(service.readTokens()).toEqual([token, token]);
  expect(await test.log(borrowerId)).not.toContain(token);
});

it('answers a refused paste without the token, and keeps it out of the page', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);

  const answer = await test.pages.run({
    operation: 'signIn',
    args: { token: wrongToken },
    projectId: 'one',
  });

  expect(answer).toEqual({
    result: { kind: 'failed', reason: 'rejected', message: notAccepted },
  });

  const page = await test.pages.open({ path: '/sign-in', projectId: 'one' });

  expect(fieldSectionOf(page).props.footer).toBe(notAccepted);
  expect(keeps(page, wrongToken)).toBe(false);
});

it('shows a check that throws as a fixed message, never the Plugin’s error that names the token', async () => {
  const service = await tokenService({});
  const test = await start(service, carelessId);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, 'token-9-77ab');

  expect(fieldSectionOf(page).props.footer).toBe(
    'Couldn’t check the token. Check your connection and paste it again.',
  );
  expect(keeps(page, 'token-9-77ab')).toBe(false);
  expect(test.accounts.list()).toEqual([]);
});

it('signs in with a pasted token whose surrounding spaces and newline are left out', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, `  ${token}\n`);

  expect(page.findText(itemsText)).toBeDefined();
  expect(service.readTokens()).toEqual([token]);
});

it('asks the service nothing for text too short to be a token, and an emptied field clears the error', async () => {
  const service = await tokenService({ [token]: 'person' });
  const test = await start(service);
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  await paste(test, page, wrongToken);
  expect(fieldSectionOf(page).props.footer).toBe(notAccepted);

  await paste(test, page, 'tok');
  await paste(test, page, '');

  expect(service.checkedTokens()).toEqual([wrongToken]);
  // The error clears, and the paste instructions are back under the field.
  expect(secretFieldOf(page).props.error).toBeUndefined();
  expect(fieldSectionOf(page).props.footer).toMatch(/^Paste an API token/);
  expect(test.accounts.list()).toEqual([]);
});
