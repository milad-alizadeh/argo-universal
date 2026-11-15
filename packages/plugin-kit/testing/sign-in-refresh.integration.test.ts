import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemorySecretStore } from '@repo/engine/mocks/secret-store';
import { expect, it, onTestFinished } from 'vitest';
import { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import {
  approving,
  clockUntil,
  itemsText,
  signInLabel,
  start,
} from './sign-in-fixture';
import type { PluginTest } from './test-types';

serialiseOnOAuthPort();

const clientSecret = 'fixture-client-secret-5e1d';

const settings = new Map([['client-secret', clientSecret]]);

const oneHourMs = 60 * 60 * 1000;

type Issued = { access: string; refresh: string };

/*
 * A service like Atlassian's: every exchange and refresh needs the client secret, each refresh rotates the refresh
 * token, and a refresh token already spent, or revoked, is refused with `invalid_grant`.
 */
async function rotatingService() {
  let issued = 0;
  let live: Issued | null = null;

  const issue = (): FixtureAnswer => {
    issued += 1;
    live = { access: `token-${issued}`, refresh: `refresh-${issued}` };

    return {
      json: {
        access_token: live.access,
        refresh_token: live.refresh,
        expires_in: oneHourMs / 1000,
        token_type: 'Bearer',
      },
    };
  };

  const token = (form: URLSearchParams): FixtureAnswer => {
    if (form.get('client_secret') !== clientSecret)
      return { status: 401, json: { error: 'invalid_client' } };

    if (form.get('grant_type') === 'authorization_code') return issue();

    return form.get('refresh_token') === live?.refresh
      ? issue()
      : { status: 400, json: { error: 'invalid_grant' } };
  };

  const read = ({ headers }: FixtureRequest): FixtureAnswer =>
    headers.authorization === `Bearer ${live?.access}`
      ? { text: itemsText }
      : { status: 401, json: { message: 'Bad token' } };

  const { network, requests } = await fixtureServices((request) =>
    request.path === '/token'
      ? token(new URLSearchParams(request.body))
      : read(request),
  );

  const forms = (): URLSearchParams[] =>
    requests
      .filter(({ path }) => path === '/token')
      .map(({ body }) => new URLSearchParams(body));

  return {
    network,
    forms,
    refreshes: () =>
      forms().filter((form) => form.get('grant_type') === 'refresh_token'),
    reads: () =>
      requests
        .filter(({ path }) => path === '/items')
        .map(({ headers }) => headers.authorization),
    revoke: () => {
      if (live) live = { ...live, refresh: 'revoked' };
    },
  };
}

type Service = Awaited<ReturnType<typeof rotatingService>>;

type Started = Parameters<typeof start>[1];

// Signs in through the browser on the Server Device, with the client secret the person set in the Plugin's settings.
async function signedIn(
  service: Service,
  options: Omit<Started, 'network'> = {},
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

const readItems = (test: PluginTest): Promise<unknown> =>
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
  await expect(readItems(before)).rejects.toThrow();
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

  service.revoke();
  await test.clock.advance(oneHourMs);

  const page = await test.pages.open({
    path: '/',
    projectId: 'one',
    serverDevice: true,
  });

  expect(page.findText(signInLabel)).toBeDefined();
  expect(service.reads()).toHaveLength(1);
  expect(test.accounts.list()).toMatchObject([{ label: 'person' }]);
}, 30_000);
