import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import {
  cacheOverMemory,
  issues,
  settled,
  type Cache,
} from './page-addresses-fixtures';

const stateOf = (cache: Cache): PageState | undefined =>
  cache.client.getQueryData(cache.addresses.state(issues).queryKey);

it('draws a region pick at its own address and keeps it with the other region and the chosen state', async () => {
  const cache = cacheOverMemory();

  await cache.addresses.change(issues, { [draftVariantKey('header')]: 'tabs' });
  await cache.addresses.change(issues, { [draftVariantKey('list')]: 'cards' });
  await cache.addresses.change(issues, { draftState: 'empty' });

  expect(cache.server.requests.at(-1)?.pageState).toEqual({
    [draftVariantKey('header')]: 'tabs',
    [draftVariantKey('list')]: 'cards',
    draftState: 'empty',
  });
});

it('steps one region without touching the pick of another', async () => {
  const cache = cacheOverMemory();

  await cache.addresses.change(issues, { [draftVariantKey('header')]: 'tabs' });
  await cache.addresses.change(issues, { [draftVariantKey('list')]: 'cards' });
  await cache.addresses.change(issues, {
    [draftVariantKey('header')]: 'search',
  });

  expect(stateOf(cache)).toEqual({
    [draftVariantKey('header')]: 'search',
    [draftVariantKey('list')]: 'cards',
  });
});

it('keeps each App its own pick, as an App keeps its own Page state', async () => {
  const phone = cacheOverMemory();
  const desktop = cacheOverMemory();

  await phone.addresses.change(issues, { [draftVariantKey('header')]: 'tabs' });
  await settled();

  expect(stateOf(phone)).toEqual({ [draftVariantKey('header')]: 'tabs' });
  expect(stateOf(desktop)).toBeUndefined();
  expect(desktop.server.requests).toEqual([]);
});
