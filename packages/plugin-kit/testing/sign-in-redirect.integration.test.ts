import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
import { serviceFixture } from './sign-in-fixture';
import { clockUntil, itemsText, signInLabel, start, wait } from './sign-in-run';

serialiseOnOAuthPort();

const surface = { platform: 'web' } as const;

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

it('signs in through the browser with PKCE and no secret on the Server Device', async () => {
  const service = await serviceFixture();
  const opened: URL[] = [];

  const test = await start('redirect', {
    network: service.network,
    openBrowser: approving(opened),
  });

  const page = await test.mount({
    page: '/',
    surface,
    projectId: 'one',
    serverDevice: true,
  });

  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);

  const authorize = new URL(opened[0] ?? '');
  const body = new URLSearchParams(service.tokenBodies().at(-1));

  expect(authorize.pathname).toBe('/authorize');
  expect(param(authorize, 'client_id')).toBe('fixture-client');
  expect(param(authorize, 'code_challenge_method')).toBe('S256');
  expect(body.get('grant_type')).toBe('authorization_code');
  expect(body.get('code')).toBe('fixture-code');
  expect(body.has('client_secret')).toBe(false);
  expect(param(authorize, 'code_challenge')).toBe(
    challengeOf(body.get('code_verifier') ?? ''),
  );
  expect(service.readTokens().at(-1)).toBe('token-1');
}, 40_000);

it('reaches the items from a page with no Project, as the authoring example does', async () => {
  const service = await serviceFixture();

  const test = await start('redirect', {
    network: service.network,
    openBrowser: approving([]),
  });

  const page = await test.mount({ page: '/', surface, serverDevice: true });

  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);
}, 40_000);

it('says to continue on the Server Device, on a paired Device, and asks nothing of the service', async () => {
  const service = await serviceFixture();
  const test = await start('redirect', { network: service.network });
  const page = await test.mount({ page: '/', surface, projectId: 'one' });

  await expect
    .poll(() => JSON.stringify(page.trees.at(-1)), wait)
    .toContain('continue on the Server Device');
  expect(page.findText(signInLabel)).toBeUndefined();
  expect(service.requests).toHaveLength(0);
}, 30_000);

it('offers another try when the browser never comes back', async () => {
  const service = await serviceFixture();

  const test = await start('redirect', {
    network: service.network,
    openBrowser: async () => {},
  });

  const page = await test.mount({
    page: '/sign-in',
    surface,
    serverDevice: true,
  });

  await page.press(signInLabel);
  await expect
    .poll(() => JSON.stringify(page.trees.at(-1)), wait)
    .toContain('your browser');
  await clockUntil(test, page, 'Sign-in did not finish');
  expect(page.findText('Try again')).toBeDefined();
  expect(service.tokenBodies()).toHaveLength(0);
}, 40_000);
