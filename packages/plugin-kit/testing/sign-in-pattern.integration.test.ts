import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
import {
  clockUntil,
  itemsText,
  serviceFixture,
  signInLabel,
  start,
} from './sign-in-fixture';

serialiseOnOAuthPort();

const challengeOf = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

const param = (url: URL, name: string): string =>
  url.searchParams.get(name) ?? '';

// Plays the browser: the person approves at once, so the service sends them back to Argo with a code.
const approving =
  (opened: URL[]) =>
  async (url: string): Promise<void> => {
    const authorize = new URL(url);
    const back = new URL(param(authorize, 'redirect_uri'));

    opened.push(authorize);
    back.searchParams.set('state', param(authorize, 'state'));
    back.searchParams.set('code', 'fixture-code');
    await fetch(back);
  };

it('signs a throwaway Plugin in with the device flow, from a paired Device, and reads as the person', async () => {
  const service = await serviceFixture();
  const test = await start('device', { network: service.network });
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  expect(page.findText(signInLabel)).toBeDefined();
  expect(service.requests).toHaveLength(0);

  await page.press(signInLabel);
  await page.draw();
  expect(page.findText('WDJB-MJHT')).toBeDefined();
  await clockUntil(test, page, itemsText);

  expect(service.readTokens().at(-1)).toBe('token-1');
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
});

it('signs a throwaway Plugin in through the browser with PKCE and no secret, on the Server Device', async () => {
  const service = await serviceFixture();
  const opened: URL[] = [];

  const test = await start('redirect', {
    network: service.network,
    openBrowser: approving(opened),
  });

  const page = await test.pages.open({
    path: '/',
    projectId: 'one',
    serverDevice: true,
  });

  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);

  const body = new URLSearchParams(service.tokenBodies().at(-1));
  const authorize = opened[0] ?? new URL('https://none.example');

  expect(param(authorize, 'code_challenge_method')).toBe('S256');
  expect(body.has('client_secret')).toBe(false);
  expect(param(authorize, 'code_challenge')).toBe(
    challengeOf(body.get('code_verifier') ?? ''),
  );
  expect(service.readTokens().at(-1)).toBe('token-1');
});

it('says to continue on the Server Device for a redirect flow on a paired Device, and asks nothing of the service', async () => {
  const service = await serviceFixture();
  const test = await start('redirect', { network: service.network });
  const page = await test.pages.open({ path: '/', projectId: 'one' });

  expect(page.findText('Continue on the Server Device')).toBeDefined();
  expect(page.findText(signInLabel)).toBeUndefined();
  expect(service.requests).toHaveLength(0);
});
