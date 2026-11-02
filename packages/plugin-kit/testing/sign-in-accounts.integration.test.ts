import { expect, it } from 'vitest';
import {
  addAccount,
  clockUntil,
  hasText,
  itemsText,
  labels,
  items,
  rejectedText,
  signInLabel,
  signInOn,
  started,
  surface,
  wait,
  type Run,
  type View,
} from './sign-in-run';

const host = 'api.service.example';

const chosen = async (
  { test }: Run,
  projectId: string,
): Promise<string | undefined> =>
  (await test.accounts.get(host, projectId))?.label;

// The service stops taking every token it has given out, and the page's next read finds out.
async function rejectsTokens(
  { test, service }: Run,
  page: View,
): Promise<void> {
  service.accepted.clear();
  await clockUntil(test, page, rejectedText);
}

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
  await clockUntil(test, page, rejectedText);
  await signInOn(run, page, 'person-1');

  const [first, second] = test.accounts.list();

  expect(first).toMatchObject({ providedBy: 'sign-in-device' });
  expect(second).toMatchObject({
    providedBy: 'sign-in-sharing',
    label: 'person-1',
  });
  expect((await test.accounts.get(host, 'one'))?.id).toBe(second?.id);
}, 60_000);

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
  await clockUntil(test, page, signInLabel);
  expect(hasText(page, rejectedText)).toBe(false);

  await signInOn(run, page, 'person-1');

  expect(labels(run)).toEqual(['person-1']);
}, 40_000);
