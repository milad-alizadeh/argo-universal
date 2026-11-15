import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { MemorySecretStore } from '@repo/engine/mocks/secret-store';
import { expect, it, onTestFinished } from 'vitest';
import { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
import {
  approving,
  clockUntil,
  itemsText,
  signInLabel,
  start,
  type StartOptions,
} from './sign-in-fixture';
import {
  clientSecret,
  oneHourMs,
  rotatingService,
  type RotatingService,
} from './sign-in-rotating-service';
import type { PluginTest } from './test-types';

serialiseOnOAuthPort();

const settings = new Map([['client-secret', clientSecret]]);

// Signs in through the browser on the Server Device, with the client secret the person set in the Plugin's settings.
async function signedIn(
  service: RotatingService,
  options: Omit<StartOptions, 'network'> = {},
): Promise<PluginTest> {
  const test = await start('confidential', {
    network: service.network,
    openBrowser: approving(),
    settings,
    ...options,
  });

  const page = await test.pages.open({
    path: '/',
    projectId: 'one',
    serverDevice: true,
  });

  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);

  return test;
}

const readItems = (test: PluginTest): Promise<PageRunAnswer> =>
  test.pages.run({ operation: 'readItems', args: {}, projectId: 'one' });

const items = { result: { items: itemsText } };

it('sends the client secret from a secret Setting on the exchange, and never shows or logs it', async () => {
  const service = await rotatingService();
  const test = await signedIn(service);

  expect(service.forms()[0]?.get('client_secret')).toBe(clientSecret);
  expect(service.reads().at(-1)).toBe('Bearer token-1');

  const page = await test.pages.open({ path: '/sign-in', serverDevice: true });

  expect(JSON.stringify(page.tree)).not.toContain(clientSecret);
  expect(await test.log()).not.toContain(clientSecret);
}, 30_000);

it('refreshes a token that ran out with the client secret, and keeps the rotated pair', async () => {
  const service = await rotatingService();
  const test = await signedIn(service);

  await test.clock.advance(oneHourMs);

  await expect(readItems(test)).resolves.toEqual(items);
  await expect(readItems(test)).resolves.toEqual(items);

  expect(service.refreshes()).toHaveLength(1);
  expect(Object.fromEntries(service.refreshes()[0] ?? [])).toEqual({
    grant_type: 'refresh_token',
    client_id: 'fixture-client',
    client_secret: clientSecret,
    refresh_token: 'refresh-1',
  });
  expect(service.reads().at(-1)).toBe('Bearer token-2');
  expect(await test.log()).not.toContain(clientSecret);
}, 30_000);

it('spends a rotating refresh token once when two reads find it due together', async () => {
  const service = await rotatingService();
  const test = await signedIn(service);

  await test.clock.advance(oneHourMs);

  await expect(
    Promise.all([readItems(test), readItems(test)]),
  ).resolves.toEqual([items, items]);
  expect(service.refreshes()).toHaveLength(1);
}, 30_000);

// Keeps each value, then stops as a Server that quits right after the rotated pair is written would.
class StoppingAfterRotation extends MemorySecretStore {
  override async set(
    service: string,
    account: string,
    value: string,
  ): Promise<void> {
    await super.set(service, account, value);

    if (value.includes('refresh-2')) throw new Error('The Server stopped.');
  }
}

it('stays signed in when the Server stops between keeping a rotated refresh token and using it', async () => {
  const service = await rotatingService();
  const store = new StoppingAfterRotation();
  const home = await mkdtemp(join(tmpdir(), 'argo-sign-in-'));

  onTestFinished(() => rm(home, { recursive: true, force: true }));

  const before = await signedIn(service, { secretStore: store, home });

  await before.clock.advance(oneHourMs);
  await expect(readItems(before)).rejects.toThrow(
    'Account is temporarily unavailable',
  );
  expect(service.reads().at(-1)).toBe('Bearer token-1');
  await before.close();

  const after = await start('confidential', {
    network: service.network,
    settings,
    secretStore: store,
    home,
    clockStart: oneHourMs + 60_000,
  });

  await expect(readItems(after)).resolves.toEqual(items);
  expect(service.refreshes()).toHaveLength(1);
  expect(service.reads().at(-1)).toBe('Bearer token-2');
}, 30_000);

it('draws the sign-in when the service refuses an expired or revoked refresh token', async () => {
  const service = await rotatingService();
  const test = await signedIn(service);

  const readsSignedIn = service.reads().length;

  service.revoke();
  await test.clock.advance(oneHourMs);

  const page = await test.pages.open({
    path: '/',
    projectId: 'one',
    serverDevice: true,
  });

  expect(page.findText(signInLabel)).toBeDefined();
  await page.draw();
  expect(service.reads()).toHaveLength(readsSignedIn);
  // The refused token is forgotten, so the next read does not spend it, and the client secret, again.
  expect(service.refreshes()).toHaveLength(1);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
}, 30_000);

it('never repeats a client secret the service quotes back when it refuses the sign-in', async () => {
  const service = await rotatingService();
  const wrong = 'fixture-wrong-secret-77c2';

  const test = await start('confidential', {
    network: service.network,
    openBrowser: approving(),
    settings: new Map([['client-secret', wrong]]),
  });

  const page = await test.pages.open({ path: '/sign-in', serverDevice: true });

  await page.press(signInLabel);
  await clockUntil(test, page, 'Couldn’t sign in');

  expect(
    page.findText(
      'The service refused the sign-in (401): invalid_client, Unknown secret [secret]',
    ),
  ).toBeDefined();
  expect(JSON.stringify(page.tree)).not.toContain(wrong);
  expect(await test.log()).not.toContain(wrong);
}, 30_000);
