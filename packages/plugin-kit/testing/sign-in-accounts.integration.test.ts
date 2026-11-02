import { expect, it } from 'vitest';
import {
  addAccount,
  clockUntil,
  hasText,
  itemsText,
  signInLabel,
  started,
  surface,
  wait,
  type Service,
  type View,
} from './sign-in-fixture';
import type { PluginTest } from './test-types';

const host = 'api.service.example';

const severalText =
  'Several Service Accounts are signed in. Open this from a Project, or sign out of one in Settings.';

type Run = { test: PluginTest; service: Service };

const items = (test: PluginTest, projectId?: string): Promise<View> =>
  test.mount({ page: '/', surface, projectId });

const labels = ({ test }: Run): string[] =>
  test.accounts.list().map(({ label }) => label);

const chosen = async (
  { test }: Run,
  projectId: string,
): Promise<string | undefined> =>
  (await test.accounts.get(host, projectId))?.label;

// The service stops taking every token it has given out, and the page's next read finds out.
async function rejectsTokens({ test, service }: Run, page: View): Promise<void> {
  service.accepted.clear();
  await test.clock.advance(61_000);
  await expect.poll(() => hasText(page, 'no longer accepts'), wait).toBe(true);
}

async function signInOn(
  { test, service }: Run,
  page: View,
  login: string,
): Promise<void> {
  service.person.login = login;
  await page.press(signInLabel);
  await clockUntil(test, page, itemsText);
}

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
  expect(await chosen(run, 'one')).toBeUndefined();
}, 40_000);

it('gives a different person a new row with their label, moves the Project to it and keeps the old row', async () => {
  const run = await started();
  const page = await items(run.test, 'one');

  await signInOn(run, page, 'person-1');
  await rejectsTokens(run, page);
  await signInOn(run, page, 'person-2');

  expect(labels(run)).toEqual(['person-1', 'person-2']);
  expect(await chosen(run, 'one')).toBe('person-2');
  expect(run.service.readTokens().at(-1)).toBe('token-2');
}, 40_000);

it('reuses the row when the same person signs in again', async () => {
  const run = await started();
  const page = await items(run.test, 'one');

  await signInOn(run, page, 'person-1');

  const [before] = run.test.accounts.list();

  await rejectsTokens(run, page);
  await signInOn(run, page, 'person-1');

  expect(run.test.accounts.list()).toEqual([before]);
  expect(run.service.readTokens().at(-1)).toBe('token-2');
}, 40_000);

it('reaches the items from a Project with two Accounts and no choice, and records the choice', async () => {
  const run = await started();

  await addAccount(run, 'person-1');
  await addAccount(run, 'person-2');

  const page = await items(run.test, 'one');

  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  await signInOn(run, page, 'person-3');

  expect(labels(run)).toHaveLength(3);
  expect(await chosen(run, 'one')).toBe('person-3');
  expect(await chosen(run, 'two')).toBeUndefined();
}, 60_000);

it('moves a Project to the Account a sign-in names it for, over the choice it had', async () => {
  const run = await started();
  const page = await items(run.test, 'one');

  await signInOn(run, page, 'person-1');
  await addAccount(run, 'person-2');

  const [, second] = run.test.accounts.list();

  await run.test.accounts.choose({
    host,
    projectId: 'one',
    account: second?.id ?? '',
  });
  expect(await chosen(run, 'one')).toBe('person-2');

  const fresh = await items(run.test, 'two');

  await expect.poll(() => fresh.findText(signInLabel), wait).toBeDefined();
  await signInOn(run, fresh, 'person-1');

  expect(labels(run)).toEqual(['person-1', 'person-2']);
  expect(await chosen(run, 'two')).toBe('person-1');
  expect(await chosen(run, 'one')).toBe('person-2');
}, 60_000);

it('records nothing for a sign-in that names no Project, even over a choice', async () => {
  const run = await started();

  await signInOn(run, await items(run.test, 'one'), 'person-1');
  await addAccount(run, 'person-2');

  expect(labels(run)).toEqual(['person-1', 'person-2']);
  expect(await chosen(run, 'one')).toBe('person-1');
  expect(await chosen(run, 'two')).toBeUndefined();
}, 40_000);

it('gives a second Plugin signing in to the same host its own row, and moves the Project to it', async () => {
  const run = await started();
  const { test, service } = run;
  const own = await items(test, 'one');

  await signInOn(run, own, 'person-1');

  const page = await test.mount({
    page: '/',
    surface,
    projectId: 'one',
    pluginId: 'sign-in-sharing',
  });

  await expect.poll(() => hasText(page, itemsText), wait).toBe(true);
  service.accepted.clear();
  await test.clock.advance(61_000);
  await expect.poll(() => hasText(page, 'no longer accepts'), wait).toBe(true);
  await signInOn(run, page, 'person-1');

  const [first, second] = test.accounts.list();

  expect(first).toMatchObject({ providedBy: 'sign-in-device' });
  expect(second).toMatchObject({
    providedBy: 'sign-in-sharing',
    label: 'person-1',
  });
  expect((await test.accounts.get(host, 'one'))?.id).toBe(second?.id);
}, 60_000);

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
  await clockUntil(test, page, itemsText);
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

it('recovers from a rejected token by signing in again, with no duplicate row', async () => {
  const run = await started();
  const page = await items(run.test, 'one');

  await signInOn(run, page, 'person-1');
  await rejectsTokens(run, page);
  await signInOn(run, page, 'person-1');

  expect(labels(run)).toEqual(['person-1']);
}, 40_000);

it('recovers from a missing secret by signing in again, with no duplicate row', async () => {
  const run = await started();
  const { test } = run;
  const page = await items(test, 'one');

  await signInOn(run, page, 'person-1');

  const lose = await test.mount({
    page: '/lose-token',
    surface,
    projectId: 'one',
  });

  await lose.press('Lose the token');
  await test.clock.advance(61_000);
  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  expect(hasText(page, 'no longer accepts')).toBe(false);

  await signInOn(run, page, 'person-1');

  expect(labels(run)).toEqual(['person-1']);
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
