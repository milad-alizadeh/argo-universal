import { expect, it } from 'vitest';
import {
  addAccount,
  clockUntil,
  hasText,
  itemsText,
  nextReadUntil,
  rejectedText,
  signInLabel,
  started,
  surface,
  wait,
  type View,
} from './sign-in-run';
import type { PluginTest } from './test-types';

const items = (test: PluginTest, projectId: string): Promise<View> =>
  test.mount({ page: '/', surface, projectId });

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
    expect.objectContaining({ label: 'person-1' }),
  ]);
}, 40_000);

it('leaves another Project on its own Account when a sign-in moves this one', async () => {
  const run = await started();
  const { test, service } = run;

  await addAccount(run, 'person-1');
  await addAccount(run, 'person-2');

  const [first, second] = test.accounts.list();

  if (!first || !second) throw new Error('Expected two Accounts');

  const host = 'api.service.example';

  await test.accounts.choose({ host, projectId: 'one', account: first.id });
  await test.accounts.choose({ host, projectId: 'two', account: second.id });

  const page = await items(test, 'two');

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);

  // The second Account's token dies; a read on the first Account's Project has no part in this.
  service.accepted.delete('token-2');
  await nextReadUntil(test, page, rejectedText);

  service.person.login = 'person-3';
  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);

  expect(service.readTokens().at(-1)).toBe('token-3');
  expect(test.accounts.list()).toHaveLength(3);

  const other = await items(test, 'one');

  await expect.poll(() => hasText(other, itemsText), wait).toBe(true);
  expect(service.readTokens().at(-1)).toBe('token-1');
}, 60_000);

it('refreshes a token about to run out, and hands the page the new one', async () => {
  const { test, service } = await started();

  service.expiresIn.seconds = 3600;
  await addAccount({ test, service }, 'person-1');

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
  await addAccount({ test, service }, 'person-1');

  const page = await items(test, 'one');

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);
  service.tokenEndpoint.refusing = true;
  service.accepted.clear();
  await test.clock.advance(3_600_000);
  await nextReadUntil(test, page, rejectedText);
  expect(service.tokenBodies().at(-1)?.get('grant_type')).toBe('refresh_token');
}, 40_000);

it('copies the code and opens the service on one press, and ends in the expired step when the countdown runs out', async () => {
  const { test, service } = await started();
  const page = await test.mount({ page: '/sign-in', surface });

  service.approval.pending = true;
  service.approval.lifetime = 60;
  await page.press(signInLabel);
  await expect.poll(() => hasText(page, '1:00'), wait).toBe(true);
  await page.press('Copy code and open Service');

  expect(page.actions).toEqual([
    {
      action: 'sequence',
      steps: [
        { action: 'copy', text: 'WDJB-MJHT' },
        { action: 'openUrl', url: 'https://auth.service.example/activate' },
      ],
    },
  ]);

  await test.clock.advance(1_000);
  await expect.poll(() => hasText(page, '0:59'), wait).toBe(true);
  await clockUntil(test, page, 'The code expired');

  expect(JSON.stringify(page.trees)).not.toMatch(/"-\d+:\d+"/);
  expect(page.findText('Try again')).toBeDefined();
}, 40_000);
