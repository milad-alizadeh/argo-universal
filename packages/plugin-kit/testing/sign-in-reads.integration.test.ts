import { expect, it } from 'vitest';
import {
  addAccount,
  nextReadUntil,
  hasText,
  itemsText,
  items,
  labels,
  signInLabel,
  signInOn,
  started,
  surface,
  wait,
  type Run,
  type View,
} from './sign-in-run';

const severalText =
  'Several Service Accounts are signed in. Open this from a Project, or sign out of one in Settings.';

async function showingItems(run: Run, projectId?: string): Promise<View> {
  const page = await items(run.test, projectId);

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);

  return page;
}

it('reaches the items after signing in on a page with no Project, and records no choice', async () => {
  const run = await started();
  const page = await items(run.test);

  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  await signInOn(run, page, 'person-1');

  expect(labels(run)).toEqual(['person-1']);

  await addAccount(run, 'person-2');
  expect(await run.test.accounts.get('api.service.example', 'one')).toBeNull();
}, 40_000);

it('draws the message and no sign-in for several Accounts and no Project, until one is signed out', async () => {
  const run = await started();
  const { test, service } = run;

  await addAccount(run, 'person-1');
  await addAccount(run, 'person-2');

  const asked = service.requests.length;
  const page = await items(test);

  await expect.poll(() => hasText(page, severalText), wait).toBe(true);
  expect(page.findText(signInLabel)).toBeUndefined();
  expect(service.requests).toHaveLength(asked);

  const [first] = test.accounts.list();

  await test.accounts.signOut(first?.id ?? '');
  await nextReadUntil(test, page, itemsText);
}, 60_000);

it('refuses a read with several Accounts and no Project, naming `projectId` to the author', async () => {
  const run = await started();

  await addAccount(run, 'person-1');
  await addAccount(run, 'person-2');

  const answer = await run.test.mount({ page: '/answer', surface });

  await expect.poll(() => hasText(answer, 'refused: '), wait).toBe(true);
  expect(hasText(answer, 'projectId')).toBe(true);

  const account = await run.test.mount({ page: '/account', surface });

  await expect.poll(() => hasText(account, 'refused: '), wait).toBe(true);
  expect(hasText(account, 'projectId')).toBe(true);
}, 40_000);

it('answers `accounts.get` with the only Account when there is no Project', async () => {
  const run = await started();

  await addAccount(run, 'person-1');

  const account = await run.test.mount({ page: '/account', surface });

  await expect
    .poll(() => hasText(account, 'account: person-1'), wait)
    .toBe(true);
}, 40_000);

it('still refuses a read naming an unregistered Project, in the page and not as the message', async () => {
  const run = await started();

  await addAccount(run, 'person-1');
  await addAccount(run, 'person-2');

  const page = await run.test.mount({ page: '/gated-answer', surface });

  await expect
    .poll(() => hasText(page, 'refused: Refused: Project is unavailable'), wait)
    .toBe(true);
  expect(hasText(page, severalText)).toBe(false);
}, 40_000);

it('shares one call between two reads with no Project', async () => {
  const run = await started();

  await addAccount(run, 'person-1');
  await showingItems(run);

  const reads = run.service.readTokens().length;

  await showingItems(run);

  expect(run.service.readTokens()).toHaveLength(reads);
}, 40_000);

it('never shares an entry between a read with no Project and a Project’s', async () => {
  const run = await started();

  await addAccount(run, 'person-1');
  await showingItems(run);

  const reads = run.service.readTokens().length;

  await showingItems(run, 'one');

  expect(run.service.readTokens()).toHaveLength(reads + 1);
}, 40_000);
