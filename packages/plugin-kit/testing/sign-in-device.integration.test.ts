import { expect, it } from 'vitest';
import {
  clockUntil,
  itemsText,
  serviceFixture,
  signInLabel,
  start,
  wait,
  type ServiceFixture,
  type View,
} from './sign-in-fixture';
import type { PluginTest } from './test-types';

const surface = { platform: 'web' } as const;

const rejectedText = 'no longer accepts';

const hasText = (view: View, text: string): boolean =>
  JSON.stringify(view.trees.at(-1)).includes(text);

type Service = ServiceFixture & Awaited<ReturnType<typeof serviceFixture>>;

async function signInPage(test: PluginTest): Promise<void> {
  const page = await test.mount({ page: '/sign-in', surface });

  await page.press(signInLabel);
  await clockUntil(test, page, 'Signed in as');
}

const items = (test: PluginTest, projectId: string): Promise<View> =>
  test.mount({ page: '/', surface, projectId });

async function started(): Promise<{ test: PluginTest; service: Service }> {
  const service = await serviceFixture();
  const test = await start('device', { network: service.network });

  return { test, service };
}

it('draws the sign-in for a page with no Account, then the page, without asking the service for anything first', async () => {
  const { test, service } = await started();
  const page = await items(test, 'one');

  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  expect(service.requests).toHaveLength(0);

  await page.press(signInLabel);
  await expect.poll(() => hasText(page, 'WDJB-MJHT'), wait).toBe(true);
  await clockUntil(test, page, itemsText);

  expect(service.readTokens().at(-1)).toBe('token-1');
  expect(service.tokenBodies().at(-1)?.get('client_id')).toBe('fixture-client');
  expect(test.accounts.list()).toEqual([
    expect.objectContaining({ label: 'person-token-1' }),
  ]);
}, 40_000);

it('rewrites the token of the Account that Project uses, when another Project uses another', async () => {
  const { test, service } = await started();

  await signInPage(test);
  await signInPage(test);

  const [first, second] = test.accounts.list();

  if (!first || !second) throw new Error('Expected two Accounts');

  const host = 'api.service.example';

  await test.accounts.choose({ host, projectId: 'one', account: first.id });
  await test.accounts.choose({ host, projectId: 'two', account: second.id });

  const page = await items(test, 'two');

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);

  // The second Account's token dies; a read on the first Account's Project has no part in this.
  service.accepted.delete('token-2');
  await test.clock.advance(61_000);
  await expect.poll(() => hasText(page, rejectedText), wait).toBe(true);

  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);

  expect(service.readTokens().at(-1)).toBe('token-3');
  expect(test.accounts.list()).toHaveLength(2);

  const other = await items(test, 'one');

  await expect.poll(() => hasText(other, itemsText), wait).toBe(true);
  expect(service.readTokens().at(-1)).toBe('token-1');
}, 60_000);

it('refreshes a token about to run out, and hands the page the new one', async () => {
  const { test, service } = await started();

  service.expiresIn.seconds = 3600;
  await signInPage(test);

  const page = await items(test, 'one');

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);
  await test.clock.advance(3_600_000);
  await expect
    .poll(async () => {
      await test.clock.advance(61_000);

      return service.readTokens().at(-1);
    }, wait)
    .toBe('token-2');

  const refresh = new URLSearchParams(service.tokenBodies().at(-1));

  expect(refresh.get('grant_type')).toBe('refresh_token');
  expect(refresh.get('refresh_token')).toBe('refresh-token-1');
  expect(refresh.has('client_secret')).toBe(false);
}, 40_000);

it('sends the person to sign in again when a refresh is refused and the token runs out', async () => {
  const { test, service } = await started();

  service.expiresIn.seconds = 3600;
  await signInPage(test);

  const page = await items(test, 'one');

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);
  service.accepted.clear();
  await test.clock.advance(3_600_000);

  await expect.poll(() => hasText(page, rejectedText), wait).toBe(true);
}, 40_000);

it('says where to sign in again when another Plugin provides the Account, before asking for a code', async () => {
  const { test, service } = await started();

  await signInPage(test);
  service.accepted.clear();

  const page = await test.mount({
    page: '/',
    surface,
    projectId: 'one',
    pluginId: 'sign-in-sharing',
  });

  await expect.poll(() => hasText(page, rejectedText), wait).toBe(true);

  const asked = service.requests.length;

  await page.press(signInLabel);
  await expect
    .poll(() => hasText(page, 'comes from the sign-in-device Plugin'), wait)
    .toBe(true);
  expect(service.requests).toHaveLength(asked);
}, 40_000);
